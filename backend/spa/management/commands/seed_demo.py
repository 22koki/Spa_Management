import os
from datetime import datetime, time, timedelta

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from spa.models import (
    Booking,
    BusinessSettings,
    Availability,
    ClientProfile,
    Location,
    Payment,
    Reminder,
    Room,
    Service,
    StaffProfile,
    User,
)


class Command(BaseCommand):
    help = 'Create an idempotent, presentation-ready Serenity Spa dataset.'

    def add_arguments(self, parser):
        parser.add_argument('--confirm', action='store_true', help='Required safety acknowledgement.')

    def handle(self, *args, **options):
        if not options['confirm']:
            raise CommandError('Run again with --confirm. This command creates demonstration records.')

        password = os.getenv('DEMO_PASSWORD', 'SpaDemo2026!')
        business, _ = BusinessSettings.objects.get_or_create(pk=1)
        business.name = 'Serenity Spa'
        business.tagline = 'Restore · Rebalance · Belong'
        business.email = business.email or 'hello@serenityspa.example'
        business.phone = business.phone or '+254 700 000 000'
        business.whatsapp_number = business.whatsapp_number or '+254 700 000 000'
        business.address = business.address or 'Westlands, Nairobi'
        business.save()

        location, _ = Location.objects.update_or_create(
            name='Westlands',
            defaults={'address': 'Westlands, Nairobi', 'timezone': 'Africa/Nairobi', 'is_active': True},
        )
        room, _ = Room.objects.update_or_create(
            location=location,
            name='Massage Room',
            defaults={'equipment': 'Massage table, towel warmer, aromatherapy diffuser', 'is_active': True},
        )

        users = {}
        for username, role, first_name, last_name, phone in (
            ('owner_demo', 'owner', 'Amina', 'Kamau', '+254711000001'),
            ('reception_demo', 'receptionist', 'Njeri', 'Wambui', '+254711000002'),
            ('practitioner_demo', 'practitioner', 'Faith', 'Wahome', '+254711000003'),
            ('client_demo', 'client', 'Zuri', 'Otieno', '+254711000004'),
            ('client_rebook', 'client', 'Maya', 'Njoroge', '+254711000005'),
        ):
            user, _ = User.objects.get_or_create(username=username)
            user.role = role
            user.first_name = first_name
            user.last_name = last_name
            user.phone = phone
            user.email = f'{username}@example.com'
            user.is_active = True
            user.set_password(password)
            user.save()
            users[username] = user

        practitioner = users['practitioner_demo']
        staff_profile, _ = StaffProfile.objects.get_or_create(user=practitioner)
        staff_profile.locations.add(location)
        for weekday in range(6):
            Availability.objects.update_or_create(
                staff=practitioner,
                location=location,
                weekday=weekday,
                start_time=time(9),
                defaults={'end_time': time(18), 'is_break': False},
            )
            Availability.objects.update_or_create(
                staff=practitioner,
                location=location,
                weekday=weekday,
                start_time=time(13),
                defaults={'end_time': time(14), 'is_break': True},
            )
        ClientProfile.objects.get_or_create(user=users['client_demo'], defaults={
            'preferences': 'Prefers low lighting and unscented oils.',
            'allergies': 'Lavender',
            'consent_given': True,
        })
        ClientProfile.objects.get_or_create(user=users['client_rebook'], defaults={
            'preferences': 'Medium pressure and quiet appointments.',
            'contraindications': 'Avoid high heat.',
            'consent_given': True,
            'loyalty_points': 180,
        })

        services = {}
        for name, description, duration, price, buffer in (
            ('Swedish Massage', 'A gentle full-body massage for deep relaxation.', 60, '4500.00', 15),
            ('Deep Tissue Massage', 'Focused pressure to release persistent muscle tension.', 75, '6200.00', 20),
            ('Radiance Facial', 'Hydrating facial treatment for calm, luminous skin.', 50, '3800.00', 15),
        ):
            service, _ = Service.objects.update_or_create(
                name=name,
                defaults={
                    'description': description,
                    'duration': duration,
                    'price': price,
                    'cleanup_buffer': buffer,
                    'deposit_percent': 30,
                    'location': location,
                },
            )
            services[name] = service

        today = timezone.localdate()
        booking_specs = (
            ('today_pending', users['client_demo'], services['Swedish Massage'], today, time(11), 'pending'),
            ('today_confirmed', users['client_rebook'], services['Radiance Facial'], today, time(14), 'confirmed'),
            ('tomorrow_cash', users['client_demo'], services['Deep Tissue Massage'], today + timedelta(days=1), time(10), 'confirmed'),
            ('rebooking_due', users['client_rebook'], services['Swedish Massage'], today - timedelta(days=35), time(9), 'completed'),
        )
        created = {}
        for key, client, service, date, start, status in booking_specs:
            booking, _ = Booking.objects.update_or_create(
                client=client,
                therapist=practitioner,
                date=date,
                time=start,
                defaults={
                    'service': service,
                    'status': status,
                    'location': location,
                    'room': room,
                    'notes': f'Demo record: {key}',
                },
            )
            created[key] = booking

        cash_booking = created['tomorrow_cash']
        Payment.objects.update_or_create(
            booking=cash_booking,
            defaults={
                'amount': cash_booking.service.price,
                'subtotal': cash_booking.service.price,
                'method': 'cash',
                'status': 'pending',
            },
        )
        appointment = timezone.make_aware(datetime.combine(cash_booking.date, cash_booking.time))
        Reminder.objects.update_or_create(
            booking=cash_booking,
            channel='whatsapp',
            kind='reminder',
            defaults={
                'scheduled_for': max(timezone.now(), appointment - timedelta(days=1)),
                'status': 'scheduled',
            },
        )

        self.stdout.write(self.style.SUCCESS('Demo data is ready.'))
        self.stdout.write(f'Password for all demo users: {password}')
        self.stdout.write('Owner: owner_demo | Reception: reception_demo | Practitioner: practitioner_demo | Client: client_demo')
