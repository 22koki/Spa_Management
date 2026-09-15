from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Booking, Payment, Service, User


@admin.register(User)
class SpaUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ("Spa", {"fields": ("role",)}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("Spa", {"fields": ("role",)}),
    )


admin.site.register(Service)
admin.site.register(Booking)
@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('id', 'booking', 'amount', 'method', 'status', 'receipt_number', 'date_paid')
    list_filter = ('method', 'status')
    search_fields = ('receipt_number', 'provider_reference', 'customer_reference')
    actions = ('confirm_payments',)

    @admin.action(description='Confirm selected cash/Till payments')
    def confirm_payments(self, request, queryset):
        confirmed = 0
        for payment in queryset.filter(method__in=['cash', 'mpesa_till']).exclude(status='paid'):
            payment.mark_paid()
            confirmed += 1
        self.message_user(request, f'{confirmed} payment(s) confirmed and receipted.')
