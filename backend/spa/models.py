from django.db import models
from django.contrib.auth.models import AbstractUser
from django.db.models import Q

# Custom User Model
class User(AbstractUser):
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('therapist', 'Therapist'),
        ('client', 'Client'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='client')


# Services
class Service(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()
    duration = models.IntegerField(help_text="Duration in minutes")
    price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return self.name


# Bookings
class Booking(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
        ('completed', 'Completed'),
    )
    client = models.ForeignKey(User, on_delete=models.CASCADE, related_name="client_bookings")
    therapist = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="therapist_bookings")
    service = models.ForeignKey(Service, on_delete=models.CASCADE)
    date = models.DateField()
    time = models.TimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['therapist', 'date', 'time'],
                condition=~Q(status='cancelled'),
                name='unique_active_therapist_start',
            ),
        ]

    def __str__(self):
        return f"{self.client.username} - {self.service.name}"


# Payments
class Payment(models.Model):
    STATUS_CHOICES = [('pending', 'Pending verification'), ('processing', 'Processing'), ('paid', 'Paid'), ('failed', 'Failed')]
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    method = models.CharField(max_length=20, choices=[
        ('cash', 'Cash'),
        ('mpesa_stk', 'M-PESA STK Push'),
        ('mpesa_till', 'M-PESA Till'),
        ('card', 'Card')
    ])
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    phone_number = models.CharField(max_length=20, blank=True)
    customer_reference = models.CharField(max_length=100, blank=True)
    provider_reference = models.CharField(max_length=120, blank=True, db_index=True)
    receipt_number = models.CharField(max_length=40, blank=True, unique=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    date_paid = models.DateTimeField(blank=True, null=True)

    def mark_paid(self, provider_reference=''):
        from django.utils import timezone
        if self.status == 'paid':
            return
        self.status = 'paid'
        self.date_paid = timezone.now()
        self.provider_reference = provider_reference or self.provider_reference
        self.receipt_number = self.receipt_number or f'SER-{self.pk:06d}'
        self.save(update_fields=['status', 'date_paid', 'provider_reference', 'receipt_number'])
