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
admin.site.register(Payment)