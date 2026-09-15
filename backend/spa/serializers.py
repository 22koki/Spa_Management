from rest_framework import serializers
from .models import User, Service, Booking, Payment
from django.contrib.auth.hashers import make_password
from datetime import datetime, timedelta
from django.utils import timezone

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

    class Meta:
        model = Booking
        fields = '__all__'

    def get_is_paid(self, booking):
        return hasattr(booking, 'payment')

    def validate_therapist(self, therapist):
        if therapist.role != 'therapist' or not therapist.is_active:
            raise serializers.ValidationError('Select an active therapist.')
        return therapist

    def validate(self, attrs):
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

        return attrs


class PaymentSerializer(serializers.ModelSerializer):
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Payment
        fields = '__all__'
