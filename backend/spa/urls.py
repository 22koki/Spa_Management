from django.urls import path
from .views import ServiceListCreate, BookingListCreate, PaymentCreate

urlpatterns = [
    path('services/', ServiceListCreate.as_view()),
    path('bookings/', BookingListCreate.as_view()),
    path('payments/', PaymentCreate.as_view()),
]
