from datetime import time, timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Booking, Payment, Service, User


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


class PaymentWorkflowTests(APITestCase):
    def setUp(self):
        self.client_user = User.objects.create_user(username='payer', password='pass', role='client')
        self.other_client = User.objects.create_user(username='other-payer', password='pass', role='client')
        self.admin_user = User.objects.create_user(
            username='spa-admin', password='pass', role='admin', is_staff=True
        )
        self.therapist = User.objects.create_user(username='pay-therapist', password='pass', role='therapist')
        self.service = Service.objects.create(
            name='Facial', description='Restorative facial', duration=45, price='3500.00'
        )
        tomorrow = timezone.localdate() + timedelta(days=1)
        self.booking = Booking.objects.create(
            client=self.client_user, therapist=self.therapist, service=self.service,
            date=tomorrow, time=time(14), status='confirmed'
        )
        self.other_booking = Booking.objects.create(
            client=self.other_client, therapist=self.therapist, service=self.service,
            date=tomorrow, time=time(16), status='confirmed'
        )

    def test_cash_payment_is_pending_and_amount_is_server_owned(self):
        self.client.force_authenticate(self.client_user)
        response = self.client.post(
            '/api/payments/', {'booking': self.booking.pk, 'method': 'cash', 'amount': '1.00'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        payment = Payment.objects.get()
        self.assertEqual(payment.status, 'pending')
        self.assertEqual(str(payment.amount), '3500.00')
        self.assertIsNone(payment.receipt_number)

    def test_client_cannot_pay_for_another_clients_booking(self):
        self.client.force_authenticate(self.client_user)
        response = self.client.post(
            '/api/payments/', {'booking': self.other_booking.pk, 'method': 'cash'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Payment.objects.exists())

    def test_booking_cannot_have_two_payment_attempts(self):
        Payment.objects.create(booking=self.booking, amount=self.service.price, method='cash')
        self.client.force_authenticate(self.client_user)
        response = self.client.post(
            '/api/payments/', {'booking': self.booking.pk, 'method': 'cash'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Payment.objects.count(), 1)

    def test_admin_confirmation_generates_downloadable_receipt_data(self):
        payment = Payment.objects.create(booking=self.booking, amount=self.service.price, method='cash')
        self.client.force_authenticate(self.admin_user)
        response = self.client.post(f'/api/payments/{payment.pk}/confirm/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payment.refresh_from_db()
        self.assertEqual(payment.status, 'paid')
        self.assertEqual(payment.receipt_number, f'SER-{payment.pk:06d}')
        self.assertIsNotNone(payment.date_paid)

    def test_till_reference_is_required_and_cannot_be_reused(self):
        self.client.force_authenticate(self.client_user)
        missing = self.client.post(
            '/api/payments/', {'booking': self.booking.pk, 'method': 'mpesa_till'}, format='json'
        )
        self.assertEqual(missing.status_code, status.HTTP_400_BAD_REQUEST)
        Payment.objects.create(
            booking=self.other_booking, amount=self.service.price, method='mpesa_till',
            customer_reference='TKA12ABC34'
        )
        duplicate = self.client.post(
            '/api/payments/',
            {'booking': self.booking.pk, 'method': 'mpesa_till', 'customer_reference': 'tka12abc34'},
            format='json',
        )
        self.assertEqual(duplicate.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('customer_reference', duplicate.data)
