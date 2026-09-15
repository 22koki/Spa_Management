import base64
import json
import os
from datetime import datetime
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class GatewayConfigurationError(Exception): pass
class GatewayError(Exception): pass


def _json_request(url, payload=None, headers=None, method='POST'):
    request = Request(url, data=json.dumps(payload).encode() if payload is not None else None,
                      headers={'Content-Type':'application/json', **(headers or {})}, method=method)
    try:
        with urlopen(request, timeout=20) as response:
            return json.loads(response.read().decode())
    except (HTTPError, URLError, TimeoutError) as error:
        raise GatewayError('The payment provider could not be reached.') from error


def initiate_mpesa_stk(payment):
    names=['MPESA_CONSUMER_KEY','MPESA_CONSUMER_SECRET','MPESA_SHORTCODE','MPESA_PASSKEY','MPESA_CALLBACK_URL']
    config={name:os.getenv(name) for name in names}
    if not all(config.values()): raise GatewayConfigurationError('M-PESA sandbox is not configured.')
    auth=base64.b64encode(f"{config['MPESA_CONSUMER_KEY']}:{config['MPESA_CONSUMER_SECRET']}".encode()).decode()
    token=_json_request('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',None,{'Authorization':f'Basic {auth}'},'GET')['access_token']
    stamp=datetime.now().strftime('%Y%m%d%H%M%S')
    password=base64.b64encode(f"{config['MPESA_SHORTCODE']}{config['MPESA_PASSKEY']}{stamp}".encode()).decode()
    phone=payment.phone_number.replace('+','').replace(' ','')
    if phone.startswith('0'): phone='254'+phone[1:]
    payload={'BusinessShortCode':config['MPESA_SHORTCODE'],'Password':password,'Timestamp':stamp,
             'TransactionType':'CustomerBuyGoodsOnline','Amount':int(payment.amount),'PartyA':phone,
             'PartyB':config['MPESA_SHORTCODE'],'PhoneNumber':phone,'CallBackURL':config['MPESA_CALLBACK_URL'],
             'AccountReference':f'BOOKING-{payment.booking_id}','TransactionDesc':'Serenity Spa booking'}
    return _json_request('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',payload,{'Authorization':f'Bearer {token}'})


def initiate_flutterwave(payment, email):
    key=os.getenv('FLW_SECRET_KEY'); redirect=os.getenv('FLW_REDIRECT_URL')
    if not key or not redirect: raise GatewayConfigurationError('Flutterwave sandbox is not configured.')
    tx_ref=f'SERENITY-{payment.pk}'
    payload={'tx_ref':tx_ref,'amount':str(payment.amount),'currency':'KES','redirect_url':redirect,
             'payment_options':'card','customer':{'email':email},'customizations':{'title':'Serenity Spa','description':f'Booking #{payment.booking_id}'}}
    return _json_request('https://api.flutterwave.com/v3/payments',payload,{'Authorization':f'Bearer {key}'})


def verify_flutterwave(transaction_id):
    key=os.getenv('FLW_SECRET_KEY')
    if not key: raise GatewayConfigurationError('Flutterwave sandbox is not configured.')
    return _json_request(f'https://api.flutterwave.com/v3/transactions/{transaction_id}/verify',None,{'Authorization':f'Bearer {key}'},'GET')
