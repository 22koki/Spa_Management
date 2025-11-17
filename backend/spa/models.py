from django.db import models
from django.contrib.auth.models import AbstractUser

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
    client = models.ForeignKey(User, on_delete=models.CASCADE, related_name="client_bookings")
    therapist = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="therapist_bookings")
    service = models.ForeignKey(Service, on_delete=models.CASCADE)
    date = models.DateField()
    time = models.TimeField()
    status = models.CharField(max_length=20, default="pending")

    def __str__(self):
        return f"{self.client.username} - {self.service.name}"


# Payments
class Payment(models.Model):
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    method = models.CharField(max_length=20, choices=[
        ('cash', 'Cash'),
        ('mpesa', 'MPESA'),
        ('card', 'Card')
    ])
    date_paid = models.DateTimeField(auto_now_add=True)
