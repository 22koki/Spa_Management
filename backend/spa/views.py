from rest_framework import generics
from .models import User, Service, Booking, Payment
from .serializers import UserSerializer, ServiceSerializer, BookingSerializer, PaymentSerializer, RegisterSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.views import APIView
from .payment_gateways import initiate_mpesa_stk, initiate_flutterwave, verify_flutterwave, GatewayConfigurationError, GatewayError
import hmac
import os

class IsAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (
            request.method in ('GET', 'HEAD', 'OPTIONS') or request.user.is_staff or request.user.role == 'admin'
        ))

class IsSpaAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (request.user.is_staff or request.user.role == 'admin'))

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def therapist_list(request):
    therapists = User.objects.filter(role='therapist', is_active=True)
    data = [{'id': t.id, 'username': t.username} for t in therapists]
    return Response(data)

# --- User Registration ---
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer  # <- use RegisterSerializer here
    permission_classes = [AllowAny]

# --- JWT Login ---
class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        return token

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

# --- Services ---
class ServiceListCreate(generics.ListCreateAPIView):
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer
    permission_classes = [IsAdminOrReadOnly]

# --- Bookings ---
class BookingListCreate(generics.ListCreateAPIView):
    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Booking.objects.select_related('client', 'therapist', 'service', 'payment')
        if user.role == 'admin':
            return queryset
        if user.role == 'therapist':
            return queryset.filter(therapist=user)
        return queryset.filter(client=user)

    def perform_create(self, serializer):
        if self.request.user.role != 'client':
            raise PermissionDenied('Only clients can create bookings.')

        # Lock the therapist row so concurrent requests cannot both pass the
        # availability check before either booking is committed.
        with transaction.atomic():
            therapist = User.objects.select_for_update().get(
                pk=serializer.validated_data['therapist'].pk
            )
            serializer.validated_data['therapist'] = therapist
            serializer.validate(serializer.validated_data)
            serializer.save(client=self.request.user, status='pending')

# --- Payments ---
class PaymentCreate(generics.ListCreateAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Payment.objects.select_related('booking__client', 'booking__therapist', 'booking__service')
        if user.is_staff or user.role == 'admin':
            return queryset
        if user.role == 'therapist':
            return queryset.filter(booking__therapist=user)
        return queryset.filter(booking__client=user)

    def create(self, request, *args, **kwargs):
        if self.request.user.role != 'client':
            raise PermissionDenied('Only clients can create payments.')
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking = serializer.validated_data['booking']
        if booking.client_id != self.request.user.id:
            raise PermissionDenied('You can only pay for your own booking.')
        if Payment.objects.filter(booking=booking).exists():
            return Response(
                {'booking': ['A payment has already been started for this booking.']},
                status=status.HTTP_400_BAD_REQUEST,
            )
        payment = serializer.save(amount=booking.service.price, status='pending')
        try:
            if payment.method == 'mpesa_stk':
                result = initiate_mpesa_stk(payment)
                payment.status = 'processing'
                payment.provider_reference = result.get('CheckoutRequestID', '')
                payment.save(update_fields=['status', 'provider_reference'])
                extra = {'message': 'Check your phone and enter your M-PESA PIN.'}
            elif payment.method == 'card':
                if not request.user.email:
                    payment.delete()
                    return Response({'email': ['Add an email address to your profile for card payment.']}, status=400)
                result = initiate_flutterwave(payment, request.user.email)
                payment.status = 'processing'
                payment.provider_reference = f'SERENITY-{payment.pk}'
                payment.save(update_fields=['status', 'provider_reference'])
                extra = {'checkout_url': result['data']['link']}
            else:
                extra = {'message': 'Payment submitted for staff confirmation.'}
        except GatewayConfigurationError as error:
            payment.delete()
            return Response({'detail': str(error)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except (GatewayError, KeyError) as error:
            payment.delete()
            return Response({'detail': str(error) or 'Payment initiation failed.'}, status=status.HTTP_502_BAD_GATEWAY)
        return Response({**self.get_serializer(payment).data, **extra}, status=status.HTTP_201_CREATED)


class ConfirmPaymentView(APIView):
    permission_classes = [IsSpaAdmin]
    def post(self, request, pk):
        payment = get_object_or_404(Payment, pk=pk, method__in=['cash', 'mpesa_till'])
        payment.mark_paid(request.data.get('provider_reference', ''))
        return Response(PaymentSerializer(payment).data)


@api_view(['POST'])
@permission_classes([AllowAny])
def mpesa_callback(request):
    expected = os.getenv('MPESA_CALLBACK_TOKEN', '')
    if not expected or not hmac.compare_digest(request.query_params.get('token', ''), expected):
        return Response(status=401)
    body = request.data.get('Body', {}).get('stkCallback', {})
    payment = Payment.objects.filter(provider_reference=body.get('CheckoutRequestID')).first()
    if payment and body.get('ResultCode') == 0:
        items = body.get('CallbackMetadata', {}).get('Item', [])
        receipt = next((item.get('Value') for item in items if item.get('Name') == 'MpesaReceiptNumber'), '')
        payment.mark_paid(str(receipt))
    elif payment:
        payment.status = 'failed'; payment.save(update_fields=['status'])
    return Response(status=200)


@api_view(['POST'])
@permission_classes([AllowAny])
def flutterwave_webhook(request):
    expected = os.getenv('FLW_SECRET_HASH', '')
    if not expected or not hmac.compare_digest(request.headers.get('verif-hash', ''), expected):
        return Response(status=401)
    data = request.data.get('data', {})
    payment = Payment.objects.filter(provider_reference=data.get('tx_ref')).first()
    if payment and data.get('status') == 'successful':
        try:
            verified = verify_flutterwave(data.get('id')).get('data', {})
            if (verified.get('status') == 'successful' and str(verified.get('tx_ref')) == payment.provider_reference
                    and str(verified.get('currency')) == 'KES' and float(verified.get('amount', 0)) >= float(payment.amount)):
                payment.mark_paid(str(verified.get('flw_ref', '')))
        except (GatewayError, GatewayConfigurationError):
            return Response(status=503)
    return Response(status=200)

class UserListView(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsSpaAdmin]

class TherapistListView(generics.ListAPIView):
    queryset = User.objects.filter(role="therapist")
    serializer_class = UserSerializer
