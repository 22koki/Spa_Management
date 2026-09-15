from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):
    dependencies = [('spa', '0001_initial')]

    operations = [
        migrations.AlterField(
            model_name='booking',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending', 'Pending'),
                    ('confirmed', 'Confirmed'),
                    ('cancelled', 'Cancelled'),
                    ('completed', 'Completed'),
                ],
                default='pending',
                max_length=20,
            ),
        ),
        migrations.AddConstraint(
            model_name='booking',
            constraint=models.UniqueConstraint(
                condition=~Q(status='cancelled'),
                fields=('therapist', 'date', 'time'),
                name='unique_active_therapist_start',
            ),
        ),
    ]
