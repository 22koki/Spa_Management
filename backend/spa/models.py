from django.db import models
from django.utils import timezone
from django.contrib.auth.models import AbstractUser
from django.db.models import Q

# Custom User Model
class User(AbstractUser):
    ROLE_CHOICES = (
        ('owner', 'Owner'), ('manager', 'Manager'), ('receptionist', 'Receptionist'),
        ('practitioner', 'Practitioner'), ('admin', 'Admin'), ('therapist', 'Therapist'),
        ('client', 'Client'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='client')
    phone = models.CharField(max_length=30, blank=True)

class Location(models.Model):
    name = models.CharField(max_length=120)
    address = models.CharField(max_length=255, blank=True)
    timezone = models.CharField(max_length=60, default='Africa/Nairobi')
    is_active = models.BooleanField(default=True)
    def __str__(self): return self.name

class Room(models.Model):
    location = models.ForeignKey(Location, on_delete=models.CASCADE, related_name='rooms')
    name = models.CharField(max_length=100)
    equipment = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    class Meta: unique_together = ('location', 'name')
    def __str__(self): return f'{self.location}: {self.name}'

class Skill(models.Model):
    name = models.CharField(max_length=100, unique=True)
    certification_required = models.BooleanField(default=False)
    def __str__(self): return self.name


# Services
class Service(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()
    duration = models.IntegerField(help_text="Duration in minutes")
    price = models.DecimalField(max_digits=10, decimal_places=2)
    cleanup_buffer = models.PositiveIntegerField(default=15)
    deposit_percent = models.PositiveIntegerField(default=30)
    preparation = models.TextField(blank=True)
    aftercare = models.TextField(blank=True)
    required_skills = models.ManyToManyField(Skill, blank=True, related_name='services')
    location = models.ForeignKey(Location, null=True, blank=True, on_delete=models.SET_NULL, related_name='services')

    def __str__(self):
        return self.name


# Bookings
class Booking(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'), ('booked', 'Booked'),
        ('confirmed', 'Confirmed'),
        ('arrived', 'Arrived'), ('no_show', 'No show'),
        ('cancelled', 'Cancelled'),
        ('completed', 'Completed'),
    )
    client = models.ForeignKey(User, on_delete=models.CASCADE, related_name="client_bookings")
    therapist = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="therapist_bookings")
    service = models.ForeignKey(Service, on_delete=models.CASCADE)
    date = models.DateField()
    time = models.TimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    room = models.ForeignKey(Room, null=True, blank=True, on_delete=models.SET_NULL, related_name='bookings')
    location = models.ForeignKey(Location, null=True, blank=True, on_delete=models.SET_NULL, related_name='bookings')
    notes = models.TextField(blank=True)
    cancellation_reason = models.TextField(blank=True)
    reminder_sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

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
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tip = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_type = models.CharField(max_length=12, choices=[('deposit','Deposit'),('full','Full')], default='full')

    def mark_paid(self, provider_reference=''):
        from django.utils import timezone
        if self.status == 'paid':
            return
        self.status = 'paid'
        self.date_paid = timezone.now()
        self.provider_reference = provider_reference or self.provider_reference
        self.receipt_number = self.receipt_number or f'SER-{self.pk:06d}'
        self.save(update_fields=['status', 'date_paid', 'provider_reference', 'receipt_number'])

class ServiceAddon(models.Model):
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name='addons')
    name = models.CharField(max_length=100)
    duration = models.PositiveIntegerField(default=0)
    price = models.DecimalField(max_digits=10, decimal_places=2)

class StaffProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='staff_profile')
    locations = models.ManyToManyField(Location, blank=True, related_name='staff')
    skills = models.ManyToManyField(Skill, blank=True, related_name='staff')
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    certifications = models.TextField(blank=True)

class Availability(models.Model):
    staff = models.ForeignKey(User, on_delete=models.CASCADE, related_name='availability')
    location = models.ForeignKey(Location, null=True, blank=True, on_delete=models.CASCADE)
    weekday = models.PositiveSmallIntegerField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_break = models.BooleanField(default=False)

class TimeOff(models.Model):
    staff = models.ForeignKey(User, on_delete=models.CASCADE, related_name='time_off')
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    reason = models.CharField(max_length=200, blank=True)
    approved = models.BooleanField(default=False)

class ClientProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='client_profile')
    preferences = models.TextField(blank=True)
    allergies = models.TextField(blank=True)
    contraindications = models.TextField(blank=True)
    private_notes = models.TextField(blank=True)
    consent_given = models.BooleanField(default=False)
    loyalty_points = models.PositiveIntegerField(default=0)

class IntakeForm(models.Model):
    client = models.ForeignKey(User, on_delete=models.CASCADE, related_name='intake_forms')
    booking = models.ForeignKey(Booking, null=True, blank=True, on_delete=models.SET_NULL)
    responses = models.JSONField(default=dict)
    consent_given = models.BooleanField(default=False)
    signed_at = models.DateTimeField(null=True, blank=True)

class AuditEvent(models.Model):
    actor = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)
    action = models.CharField(max_length=120)
    object_type = models.CharField(max_length=80)
    object_id = models.CharField(max_length=80, blank=True)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class Reminder(models.Model):
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='reminders')
    channel = models.CharField(max_length=10, choices=[('email','Email'),('sms','SMS'),('whatsapp','WhatsApp')])
    kind = models.CharField(max_length=20, choices=[('confirmation','Confirmation'),('reminder','Reminder'),('rebooking','Rebooking')])
    scheduled_for = models.DateTimeField()
    sent_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=12, default='pending')

class Subscription(models.Model):
    location = models.OneToOneField(Location, on_delete=models.CASCADE, related_name='subscription')
    plan = models.CharField(max_length=20, choices=[('starter','Starter'),('growth','Growth'),('multi','Multi-location')], default='starter')
    status = models.CharField(max_length=20, default='trial')
    renews_at = models.DateField(null=True, blank=True)
