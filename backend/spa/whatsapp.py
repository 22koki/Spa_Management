import json
import os
import re
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class WhatsAppConfigurationError(RuntimeError):
    pass


class WhatsAppDeliveryError(RuntimeError):
    pass


def normalize_phone(value):
    digits = re.sub(r'\D', '', value or '')
    if digits.startswith('0') and len(digits) == 10:
        return f'254{digits[1:]}'
    if len(digits) == 9 and digits[:1] in ('7', '1'):
        return f'254{digits}'
    return digits


def send_appointment_reminder(reminder):
    token = os.getenv('WHATSAPP_ACCESS_TOKEN', '')
    phone_number_id = os.getenv('WHATSAPP_PHONE_NUMBER_ID', '')
    template_name = os.getenv('WHATSAPP_TEMPLATE_NAME', '')
    graph_version = os.getenv('WHATSAPP_GRAPH_VERSION', 'v26.0')
    if not all((token, phone_number_id, template_name)):
        raise WhatsAppConfigurationError(
            'WhatsApp Cloud API is not configured. Set WHATSAPP_ACCESS_TOKEN, '
            'WHATSAPP_PHONE_NUMBER_ID, and WHATSAPP_TEMPLATE_NAME.'
        )

    booking = reminder.booking
    recipient = normalize_phone(booking.client.phone)
    if len(recipient) < 10:
        raise WhatsAppDeliveryError('The client does not have a valid WhatsApp number.')

    payload = {
        'messaging_product': 'whatsapp',
        'to': recipient,
        'type': 'template',
        'template': {
            'name': template_name,
            'language': {'code': os.getenv('WHATSAPP_TEMPLATE_LANGUAGE', 'en')},
            'components': [{
                'type': 'body',
                'parameters': [
                    {'type': 'text', 'text': booking.client.get_full_name() or booking.client.username},
                    {'type': 'text', 'text': booking.service.name},
                    {'type': 'text', 'text': booking.date.strftime('%d %B %Y')},
                    {'type': 'text', 'text': booking.time.strftime('%H:%M')},
                ],
            }],
        },
    }
    request = Request(
        f'https://graph.facebook.com/{graph_version}/{phone_number_id}/messages',
        data=json.dumps(payload).encode('utf-8'),
        headers={
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
        },
        method='POST',
    )
    try:
        with urlopen(request, timeout=20) as response:
            return json.loads(response.read().decode('utf-8'))
    except HTTPError as error:
        detail = error.read().decode('utf-8', errors='replace')
        raise WhatsAppDeliveryError(f'WhatsApp rejected the reminder: {detail[:500]}') from error
    except (URLError, TimeoutError) as error:
        raise WhatsAppDeliveryError('WhatsApp could not be reached.') from error
