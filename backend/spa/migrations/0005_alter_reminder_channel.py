from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('spa', '0004_location_skill_booking_cancellation_reason_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='reminder',
            name='channel',
            field=models.CharField(
                choices=[('email', 'Email'), ('sms', 'SMS'), ('whatsapp', 'WhatsApp')],
                max_length=10,
            ),
        ),
    ]
