from rest_framework import serializers
from .models import (User, Service, Booking, Payment, Location, Room, Skill,
    ServiceAddon, StaffProfile, Availability, TimeOff, ClientProfile,
    IntakeForm, AuditEvent, Reminder, Subscription)
from django.contrib.auth.hashers import make_password
from datetime import datetime, timedelta
from django.utils import timezone
import re

# Registration Serializer
class RegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        # Hash the password before saving
        validated_data['password'] = make_password(validated_data['password'])
        return super().create(validated_data)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'role']


class ServiceSerializer(serializers.ModelSerializer):
    addons = serializers.StringRelatedField(many=True, read_only=True)
    class Meta:
        model = Service
        fields = '__all__'


class BookingSerializer(serializers.ModelSerializer):
    client = serializers.PrimaryKeyRelatedField(read_only=True)
    status = serializers.CharField(read_only=True)
    client_name = serializers.CharField(source='client.username', read_only=True)
    therapist_name = serializers.CharField(source='therapist.username', read_only=True)
    service_name = serializers.CharField(source='service.name', read_only=True)
    duration = serializers.IntegerField(source='service.duration', read_only=True)
    price = serializers.DecimalField(source='service.price', max_digits=10, decimal_places=2, read_only=True)
    is_paid = serializers.SerializerMethodField()
    client_phone = serializers.CharField(source='client.phone', read_only=True)
    whatsapp_reminder = serializers.BooleanField(write_only=True, required=False, default=False)
    whatsapp_phone = serializers.CharField(write_only=True, required=False, allow_blank=True)
    whatsapp_reminder_status = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = '__all__'

    def get_is_paid(self, booking):
        try:
            return booking.payment.status == 'paid'
        except Payment.DoesNotExist:
            return False

    def get_whatsapp_reminder_status(self, booking):
        reminder = booking.reminders.filter(channel='whatsapp').order_by('-scheduled_for').first()
        return reminder.status if reminder else None

    def validate_therapist(self, therapist):
        if therapist.role != 'therapist' or not therapist.is_active:
            raise serializers.ValidationError('Select an active therapist.')
        return therapist

    def validate(self, attrs):
        wants_whatsapp = attrs.get('whatsapp_reminder', False)
        whatsapp_phone = attrs.get('whatsapp_phone', '').strip()
        request = self.context.get('request')
        saved_phone = getattr(getattr(request, 'user', None), 'phone', '')
        if wants_whatsapp and not (whatsapp_phone or saved_phone):
            raise serializers.ValidationError({'whatsapp_phone': 'Enter a WhatsApp number for the reminder.'})
        if whatsapp_phone and len(re.sub(r'\D', '', whatsapp_phone)) < 9:
            raise serializers.ValidationError({'whatsapp_phone': 'Enter a valid WhatsApp number including the country code.'})

        booking_date = attrs.get('date')
        booking_time = attrs.get('time')
        service = attrs.get('service')
        therapist = attrs.get('therapist')

        if booking_date and booking_time:
            starts_at = timezone.make_aware(
                datetime.combine(booking_date, booking_time),
                timezone.get_current_timezone(),
            )
            if starts_at <= timezone.now():
                raise serializers.ValidationError({'date': 'Bookings must be in the future.'})

        if all((booking_date, booking_time, service, therapist)):
            requested_start = datetime.combine(booking_date, booking_time)
            requested_end = requested_start + timedelta(minutes=service.duration)
            existing = Booking.objects.filter(
                therapist=therapist,
                date=booking_date,
            ).exclude(status='cancelled').select_related('service')
            for booking in existing:
                existing_start = datetime.combine(booking.date, booking.time)
                existing_end = existing_start + timedelta(minutes=booking.service.duration)
                if requested_start < existing_end and existing_start < requested_end:
                    raise serializers.ValidationError(
                        {'time': 'This therapist is unavailable during that time.'}
                    )
            room = attrs.get('room')
            if room:
                room_bookings = Booking.objects.filter(room=room, date=booking_date).exclude(status='cancelled').select_related('service')
                for booking in room_bookings:
                    existing_start = datetime.combine(booking.date, booking.time)
                    existing_end = existing_start + timedelta(minutes=booking.service.duration + booking.service.cleanup_buffer)
                    if requested_start < existing_end and existing_start < requested_end + timedelta(minutes=service.cleanup_buffer):
                        raise serializers.ValidationError({'room':'This room is unavailable including cleanup time.'})

        return attrs

    def create(self, validated_data):
        wants_whatsapp = validated_data.pop('whatsapp_reminder', False)
        whatsapp_phone = validated_data.pop('whatsapp_phone', '').strip()
        booking = super().create(validated_data)

        if whatsapp_phone and booking.client.phone != whatsapp_phone:
            booking.client.phone = whatsapp_phone
            booking.client.save(update_fields=['phone'])

        if wants_whatsapp:
            appointment = timezone.make_aware(
                datetime.combine(booking.date, booking.time),
                timezone.get_current_timezone(),
            )
            scheduled_for = max(timezone.now(), appointment - timedelta(days=1))
            Reminder.objects.create(
                booking=booking,
                channel='whatsapp',
                kind='reminder',
                scheduled_for=scheduled_for,
                status='scheduled',
            )
        return booking


class PaymentSerializer(serializers.ModelSerializer):
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    client_name = serializers.CharField(source='booking.client.username', read_only=True)
    service_name = serializers.CharField(source='booking.service.name', read_only=True)
    appointment_date = serializers.DateField(source='booking.date', read_only=True)
    can_confirm = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = '__all__'

    def get_can_confirm(self, payment):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        return bool(
            user and user.is_authenticated
            and (user.is_staff or user.role in ('admin', 'owner', 'manager', 'receptionist'))
            and payment.status == 'pending'
            and payment.method in ('cash', 'mpesa_till', 'mpesa')
        )

    def validate(self, attrs):
        method = attrs.get('method')
        if method == 'mpesa_stk' and not attrs.get('phone_number'):
            raise serializers.ValidationError({'phone_number': 'A phone number is required for STK Push.'})
        if method == 'mpesa_till' and not attrs.get('customer_reference'):
            raise serializers.ValidationError({'customer_reference': 'Enter the M-PESA transaction code.'})
        if method == 'mpesa_till':
            reference = attrs.get('customer_reference', '').strip().upper()
            if Payment.objects.filter(method='mpesa_till', customer_reference__iexact=reference).exists():
                raise serializers.ValidationError(
                    {'customer_reference': 'This M-PESA transaction code has already been submitted.'}
                )
            attrs['customer_reference'] = reference
        return attrs

class LocationSerializer(serializers.ModelSerializer):
    class Meta: model = Location; fields = '__all__'
class RoomSerializer(serializers.ModelSerializer):
    class Meta: model = Room; fields = '__all__'
class SkillSerializer(serializers.ModelSerializer):
    class Meta: model = Skill; fields = '__all__'
class ServiceAddonSerializer(serializers.ModelSerializer):
    class Meta: model = ServiceAddon; fields = '__all__'
class StaffProfileSerializer(serializers.ModelSerializer):
    class Meta: model = StaffProfile; fields = '__all__'
class AvailabilitySerializer(serializers.ModelSerializer):
    class Meta: model = Availability; fields = '__all__'
class TimeOffSerializer(serializers.ModelSerializer):
    class Meta: model = TimeOff; fields = '__all__'
class ClientProfileSerializer(serializers.ModelSerializer):
    class Meta: model = ClientProfile; fields = '__all__'
class IntakeFormSerializer(serializers.ModelSerializer):
    class Meta: model = IntakeForm; fields = '__all__'
class AuditEventSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source='actor.username', read_only=True)
    class Meta: model = AuditEvent; fields = '__all__'
class ReminderSerializer(serializers.ModelSerializer):
    class Meta: model = Reminder; fields = '__all__'
class SubscriptionSerializer(serializers.ModelSerializer):
    class Meta: model = Subscription; fields = '__all__'
