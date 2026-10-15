from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from spa.models import Reminder
from spa.whatsapp import (
    WhatsAppConfigurationError,
    WhatsAppDeliveryError,
    send_appointment_reminder,
)


class Command(BaseCommand):
    help = 'Send scheduled WhatsApp appointment reminders that are due.'

    def add_arguments(self, parser):
        parser.add_argument('--limit', type=int, default=100)

    def handle(self, *args, **options):
        reminders = Reminder.objects.filter(
            channel='whatsapp',
            status__in=('pending', 'scheduled', 'failed'),
            scheduled_for__lte=timezone.now(),
            attempts__lt=3,
        ).select_related('booking__client', 'booking__service').order_by('scheduled_for')[:options['limit']]

        sent = 0
        failed = 0
        for reminder in reminders:
            reminder.attempts += 1
            try:
                send_appointment_reminder(reminder)
                reminder.status = 'sent'
                reminder.sent_at = timezone.now()
                reminder.last_error = ''
                reminder.booking.reminder_sent_at = reminder.sent_at
                reminder.booking.save(update_fields=['reminder_sent_at'])
                sent += 1
            except WhatsAppConfigurationError as error:
                raise CommandError(str(error)) from error
            except WhatsAppDeliveryError as error:
                reminder.status = 'failed'
                reminder.last_error = str(error)
                failed += 1
            reminder.save(update_fields=['attempts', 'status', 'sent_at', 'last_error'])

        self.stdout.write(self.style.SUCCESS(f'Sent {sent} reminder(s); {failed} failed.'))
