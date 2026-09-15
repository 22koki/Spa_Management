from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):
    dependencies = [('spa', '0002_secure_booking_status_and_slot')]
    operations = [
        migrations.AlterField(model_name='payment', name='method', field=models.CharField(choices=[('cash','Cash'),('mpesa_stk','M-PESA STK Push'),('mpesa_till','M-PESA Till'),('card','Card')], max_length=20)),
        migrations.AlterField(model_name='payment', name='date_paid', field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name='payment', name='status', field=models.CharField(choices=[('pending','Pending verification'),('processing','Processing'),('paid','Paid'),('failed','Failed')], default='pending', max_length=20)),
        migrations.AddField(model_name='payment', name='phone_number', field=models.CharField(blank=True, max_length=20)),
        migrations.AddField(model_name='payment', name='customer_reference', field=models.CharField(blank=True, max_length=100)),
        migrations.AddField(model_name='payment', name='provider_reference', field=models.CharField(blank=True, db_index=True, max_length=120)),
        migrations.AddField(model_name='payment', name='receipt_number', field=models.CharField(blank=True, max_length=40, null=True, unique=True)),
        migrations.AddField(model_name='payment', name='created_at', field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now), preserve_default=False),
    ]
