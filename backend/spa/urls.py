from django.urls import path
from .views import ServiceListCreate, RegisterView, UserListView,MyTokenObtainPairView, BookingListCreate, PaymentCreate, ConfirmPaymentView, therapist_list, mpesa_callback, flutterwave_webhook
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('services/', ServiceListCreate.as_view()),
    path('bookings/', BookingListCreate.as_view()),
    path('payments/', PaymentCreate.as_view(), name='payments'),
    path('payments/<int:pk>/confirm/', ConfirmPaymentView.as_view(), name='payment-confirm'),
    path('payments/webhooks/mpesa/', mpesa_callback, name='mpesa-callback'),
    path('payments/webhooks/flutterwave/', flutterwave_webhook, name='flutterwave-webhook'),
# urls.py
    path('users/', UserListView.as_view()),
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    path('users/therapists/', therapist_list, name='therapists'),
]
