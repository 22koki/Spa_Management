from datetime import time, timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Booking, Service, User


class BookingSecurityTests(APITestCase):
    def setUp(self):
        self.client_user = User.objects.create_user(username='client', password='pass', role='client')
        self.other_client = User.objects.create_user(username='other', password='pass', role='client')
        self.therapist = User.objects.create_user(username='therapist', password='pass', role='therapist')
        self.service = Service.objects.create(name='Massage', description='MVP service', duration=60, price='50.00')
        self.tomorrow = timezone.localdate() + timedelta(days=1)
        self.url = '/api/bookings/'

    def payload(self, **overrides):
        data = {'client': self.other_client.pk, 'therapist': self.therapist.pk,
                'service': self.service.pk, 'date': self.tomorrow.isoformat(),
                'time': '10:00:00', 'status': 'completed'}
        data.update(overrides)
        return data

    def test_booking_requires_authentication(self):
        response = self.client.post(self.url, self.payload(), format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_server_owns_client_and_initial_status(self):
        self.client.force_authenticate(self.client_user)
        response = self.client.post(self.url, self.payload(), format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        booking = Booking.objects.get()
        self.assertEqual(booking.client, self.client_user)
        self.assertEqual(booking.status, 'pending')

    def test_client_only_sees_their_bookings(self):
        Booking.objects.create(client=self.other_client, therapist=self.therapist,
                               service=self.service, date=self.tomorrow, time=time(9))
        self.client.force_authenticate(self.client_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_rejects_overlapping_therapist_booking(self):
        Booking.objects.create(client=self.other_client, therapist=self.therapist,
                               service=self.service, date=self.tomorrow, time=time(10))
        self.client.force_authenticate(self.client_user)
        response = self.client.post(self.url, self.payload(time='10:30:00'), format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('time', response.data)

    def test_rejects_non_therapist_assignment(self):
        self.client.force_authenticate(self.client_user)
        response = self.client.post(self.url, self.payload(therapist=self.other_client.pk), format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_client_cannot_create_booking(self):
        self.client.force_authenticate(self.therapist)
        response = self.client.post(self.url, self.payload(), format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

# Create your tests here.
