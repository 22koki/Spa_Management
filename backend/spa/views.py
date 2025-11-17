from rest_framework import generics
from .models import Service, Booking, Payment
from .serializers import ServiceSerializer, BookingSerializer, PaymentSerializer

# Services
class ServiceListCreate(generics.ListCreateAPIView):
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer

# Bookings
class BookingListCreate(generics.ListCreateAPIView):
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer

# Payments
class PaymentCreate(generics.CreateAPIView):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
