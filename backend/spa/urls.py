from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *
from rest_framework_simplejwt.views import TokenRefreshView

router=DefaultRouter()
for prefix, view in [('locations',LocationViewSet),('rooms',RoomViewSet),('skills',SkillViewSet),
 ('addons',AddonViewSet),('staff-profiles',StaffProfileViewSet),('availability',AvailabilityViewSet),
 ('time-off',TimeOffViewSet),('client-profiles',ClientProfileViewSet),('intake-forms',IntakeFormViewSet),
 ('reminders',ReminderViewSet),('subscriptions',SubscriptionViewSet),('audit-events',AuditEventViewSet)]:
    router.register(prefix, view)

urlpatterns = [
    path('',include(router.urls)),
    path('services/', ServiceListCreate.as_view()),
    path('bookings/', BookingListCreate.as_view()),
    path('bookings/<int:pk>/status/', booking_status),
    path('reports/dashboard/', dashboard_report),
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
