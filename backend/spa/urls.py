from django.urls import path
from .views import ServiceListCreate, RegisterView, UserListView,MyTokenObtainPairView, BookingListCreate, PaymentCreate, therapist_list
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('services/', ServiceListCreate.as_view()),
    path('bookings/', BookingListCreate.as_view()),
    path('payments/', PaymentCreate.as_view(), name='payments'),
# urls.py
    path('users/', UserListView.as_view()),
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    path('users/therapists/', therapist_list, name='therapists'),
]
