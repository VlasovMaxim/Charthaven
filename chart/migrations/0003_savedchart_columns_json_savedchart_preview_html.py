# Generated by Django 5.2 on 2025-05-05 14:56

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('chart', '0002_profile_email_confirmation_code_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='savedchart',
            name='columns_json',
            field=models.JSONField(default=list),
        ),
        migrations.AddField(
            model_name='savedchart',
            name='preview_html',
            field=models.TextField(default=''),
        ),
    ]
