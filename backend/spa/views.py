from rest_framework import generics
from .models import User, Service, Booking, Payment
from .serializers import UserSerializer, ServiceSerializer, BookingSerializer, PaymentSerializer, RegisterSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.db import transaction

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def therapist_list(request):
    therapists = User.objects.filter(role='therapist')
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

# --- Bookings ---
class BookingListCreate(generics.ListCreateAPIView):
    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Booking.objects.select_related('client', 'therapist', 'service')
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
class PaymentCreate(generics.CreateAPIView):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
class UserListView(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer

class TherapistListView(generics.ListAPIView):
    queryset = User.objects.filter(role="therapist")
    serializer_class = UserSerializer
