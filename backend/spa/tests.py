from datetime import time, timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import (
    Availability,
    Booking,
    BusinessSettings,
    Location,
    Payment,
    Reminder,
    Room,
    Service,
    User,
)


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

    def test_booking_can_schedule_a_whatsapp_reminder(self):
        self.client.force_authenticate(self.client_user)
        response = self.client.post(
            self.url,
            self.payload(whatsapp_reminder=True, whatsapp_phone='0712 345 678'),
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.client_user.refresh_from_db()
        self.assertEqual(self.client_user.phone, '0712 345 678')
        reminder = Reminder.objects.get(booking_id=response.data['id'], channel='whatsapp')
        self.assertEqual(reminder.status, 'scheduled')

# Create your tests here.


class PaymentWorkflowTests(APITestCase):
    def setUp(self):
        self.client_user = User.objects.create_user(username='payer', password='pass', role='client')
        self.other_client = User.objects.create_user(username='other-payer', password='pass', role='client')
        self.admin_user = User.objects.create_user(
            username='spa-admin', password='pass', role='admin', is_staff=True
        )
        self.owner_user = User.objects.create_user(username='spa-owner', password='pass', role='owner')
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

    def test_owner_can_list_and_confirm_pending_manual_payments(self):
        payment = Payment.objects.create(booking=self.booking, amount=self.service.price, method='cash')
        Payment.objects.create(booking=self.other_booking, amount=self.service.price, method='mpesa_till', customer_reference='TKA12ABC34')
        self.client.force_authenticate(self.owner_user)

        listing = self.client.get('/api/payments/')
        self.assertEqual(listing.status_code, status.HTTP_200_OK)
        self.assertEqual(len(listing.data), 2)
        self.assertTrue(all(item['can_confirm'] for item in listing.data))

        confirmed = self.client.post(f'/api/payments/{payment.pk}/confirm/', {}, format='json')
        self.assertEqual(confirmed.status_code, status.HTTP_200_OK)
        payment.refresh_from_db()
        self.assertEqual(payment.status, 'paid')

    def test_client_cannot_self_confirm_a_pending_payment(self):
        payment = Payment.objects.create(booking=self.booking, amount=self.service.price, method='cash')
        self.client.force_authenticate(self.client_user)

        listing = self.client.get('/api/payments/')
        self.assertFalse(listing.data[0]['can_confirm'])
        response = self.client.post(f'/api/payments/{payment.pk}/confirm/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        payment.refresh_from_db()
        self.assertEqual(payment.status, 'pending')

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

    def test_total_includes_configured_tax_and_customer_tip(self):
        BusinessSettings.objects.create(tax_percent='16.00')
        self.client.force_authenticate(self.client_user)
        response = self.client.post(
            '/api/payments/',
            {'booking': self.booking.pk, 'method': 'cash', 'tip': '100.00'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        payment = Payment.objects.get()
        self.assertEqual(str(payment.subtotal), '3500.00')
        self.assertEqual(str(payment.tax), '560.00')
        self.assertEqual(str(payment.tip), '100.00')
        self.assertEqual(str(payment.amount), '4160.00')

class OperationsMVPTests(APITestCase):
    def setUp(self):
        self.owner=User.objects.create_user(username='owner',password='pass',role='owner')
        self.client_user=User.objects.create_user(username='guest',password='pass',role='client')
        self.therapist=User.objects.create_user(username='practitioner',password='pass',role='practitioner')
        self.location=Location.objects.create(name='Westlands')
        self.room=Room.objects.create(location=self.location,name='Massage Room')
        self.service=Service.objects.create(name='Massage',description='Test',duration=60,price='1000',deposit_percent=30)
        self.booking=Booking.objects.create(client=self.client_user,therapist=self.therapist,service=self.service,
            room=self.room,location=self.location,date=timezone.localdate()+timedelta(days=1),time=time(10),status='booked')

    def test_owner_can_read_dashboard_and_confirm_booking(self):
        self.client.force_authenticate(self.owner)
        self.assertEqual(self.client.get('/api/reports/dashboard/').status_code,200)
        response=self.client.patch(f'/api/bookings/{self.booking.pk}/status/',{'status':'confirmed'},format='json')
        self.assertEqual(response.status_code,200)
        self.booking.refresh_from_db(); self.assertEqual(self.booking.status,'confirmed')

    def test_deposit_amount_is_server_calculated(self):
        self.client.force_authenticate(self.client_user)
        response=self.client.post('/api/payments/',{'booking':self.booking.pk,'method':'cash','payment_type':'deposit'},format='json')
        self.assertEqual(response.status_code,201)
        self.assertEqual(str(Payment.objects.get().amount),'300.00')

    def test_public_booking_auto_assigns_an_available_treatment_room(self):
        second_practitioner = User.objects.create_user(
            username='room-practitioner', password='pass', role='practitioner'
        )
        self.service.location = self.location
        self.service.save(update_fields=['location'])
        self.client.force_authenticate(self.client_user)
        response = self.client.post('/api/bookings/', {
            'therapist': second_practitioner.pk,
            'service': self.service.pk,
            'date': (timezone.localdate() + timedelta(days=1)).isoformat(),
            'time': '12:00:00',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Booking.objects.get(pk=response.data['id']).room, self.room)


class PublicBookingAndRolesTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username='owner-public', password='pass', role='owner')
        self.client_user = User.objects.create_user(
            username='client-public', password='pass', role='client',
            first_name='Zuri', last_name='Otieno',
        )
        self.practitioner = User.objects.create_user(
            username='practitioner-public', password='pass', role='practitioner',
            first_name='Faith', last_name='Wahome',
        )
        self.other_practitioner = User.objects.create_user(
            username='other-practitioner', password='pass', role='practitioner'
        )
        self.service = Service.objects.create(
            name='Public Massage', description='Bookable online', duration=60, price='4000.00'
        )
        self.future_date = timezone.localdate() + timedelta(days=3)
        self.booking = Booking.objects.create(
            client=self.client_user,
            therapist=self.practitioner,
            service=self.service,
            date=self.future_date,
            time=time(10),
        )

    def test_service_practitioner_and_business_catalogues_are_public(self):
        self.assertEqual(self.client.get('/api/services/').status_code, status.HTTP_200_OK)
        people = self.client.get('/api/users/therapists/')
        self.assertEqual(people.status_code, status.HTTP_200_OK)
        self.assertIn('Faith Wahome', [person['display_name'] for person in people.data])
        self.assertEqual(self.client.get('/api/business/').status_code, status.HTTP_200_OK)

    def test_current_user_returns_role_and_profile(self):
        self.client.force_authenticate(self.client_user)
        response = self.client.get('/api/auth/me/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['role'], 'client')
        self.assertEqual(response.data['first_name'], 'Zuri')

    def test_only_management_can_update_business_settings(self):
        self.client.force_authenticate(self.client_user)
        denied = self.client.patch('/api/business/', {'name': 'Not Allowed'}, format='json')
        self.assertEqual(denied.status_code, status.HTTP_403_FORBIDDEN)
        self.client.force_authenticate(self.owner)
        updated = self.client.patch('/api/business/', {'name': 'Wahome Wellness'}, format='json')
        self.assertEqual(updated.status_code, status.HTTP_200_OK)
        self.assertEqual(updated.data['name'], 'Wahome Wellness')

    def test_practitioner_only_sees_their_assigned_schedule(self):
        Booking.objects.create(
            client=self.client_user,
            therapist=self.other_practitioner,
            service=self.service,
            date=self.future_date,
            time=time(12),
        )
        self.client.force_authenticate(self.practitioner)
        response = self.client.get('/api/bookings/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item['id'] for item in response.data], [self.booking.id])

    def test_booking_respects_working_hours_and_breaks(self):
        Availability.objects.create(
            staff=self.practitioner,
            weekday=self.future_date.weekday(),
            start_time=time(9),
            end_time=time(17),
        )
        Availability.objects.create(
            staff=self.practitioner,
            weekday=self.future_date.weekday(),
            start_time=time(12),
            end_time=time(13),
            is_break=True,
        )
        self.client.force_authenticate(self.client_user)
        outside = self.client.post('/api/bookings/', {
            'therapist': self.practitioner.pk,
            'service': self.service.pk,
            'date': self.future_date.isoformat(),
            'time': '18:00:00',
        }, format='json')
        self.assertEqual(outside.status_code, status.HTTP_400_BAD_REQUEST)
        during_break = self.client.post('/api/bookings/', {
            'therapist': self.practitioner.pk,
            'service': self.service.pk,
            'date': self.future_date.isoformat(),
            'time': '12:00:00',
        }, format='json')
        self.assertEqual(during_break.status_code, status.HTTP_400_BAD_REQUEST)

    def test_client_cancellation_respects_notice_period(self):
        BusinessSettings.objects.create(cancellation_hours=96)
        self.client.force_authenticate(self.client_user)
        response = self.client.patch(
            f'/api/bookings/{self.booking.pk}/status/',
            {'status': 'cancelled'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, 'pending')
