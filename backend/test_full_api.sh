#!/bin/bash
set -e

API_URL="http://127.0.0.1:8000/api"
CLIENT_USERNAME="client_auto"
CLIENT_PASSWORD="Password12n.toolN"
THERAPIST_USERNAME="therapist_auto"

# --- Register client if not exists ---
echo "Registering a new client..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register/" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$CLIENT_USERNAME\",\"password\":\"$CLIENT_PASSWORD\",\"role\":\"client\"}")

if [[ $REGISTER_RESPONSE == *"already exists"* ]]; then
  echo "Client already exists, skipping registration..."
else
  echo "Register response: $REGISTER_RESPONSE"
fi

# --- Login ---
echo "Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login/" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$CLIENT_USERNAME\",\"password\":\"$CLIENT_PASSWORD\"}")

ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['access'])" 2>/dev/null || echo "")

if [ -z "$ACCESS_TOKEN" ]; then
  echo "Failed to login. Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "Access Token: $ACCESS_TOKEN"

# --- Get therapist ID ---
THERAPIST_RESPONSE=$(curl -s -X GET "$API_URL/services/" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

# Fetch therapist ID from DB directly if needed
THERAPIST_ID=$(python3 - <<END
from spa.models import User
t = User.objects.filter(username="$THERAPIST_USERNAME").first()
print(t.id if t else "")
END
)

echo "Using Therapist ID: $THERAPIST_ID"

# --- Create a service ---
SERVICE_RESPONSE=$(curl -s -X POST "$API_URL/services/" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Swedish Massage","description":"Relaxing full-body massage","duration":60,"price":"3500.00"}')

SERVICE_ID=$(echo $SERVICE_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])" 2>/dev/null || echo "")

if [ -z "$SERVICE_ID" ]; then
  # If service already exists, pick first one
  SERVICE_ID=$(python3 - <<END
from spa.models import Service
s = Service.objects.filter(name="Swedish Massage").first()
print(s.id if s else "")
END
)
fi

echo "Service ID: $SERVICE_ID"

# --- Create a booking ---
BOOKING_RESPONSE=$(curl -s -X POST "$API_URL/bookings/" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"client\": 5, \"therapist\": $THERAPIST_ID, \"service\": $SERVICE_ID, \"date\": \"$(date +%Y-%m-%d)\", \"time\": \"10:00:00\"}")

echo "Booking Response: $BOOKING_RESPONSE"

# --- Create a payment ---
PAYMENT_RESPONSE=$(curl -s -X POST "$API_URL/payments/" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"booking\": $(python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" <<< "$BOOKING_RESPONSE"), \"amount\": 3500.00, \"method\":\"card\"}")

echo "Payment Response: $PAYMENT_RESPONSE"

# --- List Services ---
echo "Listing Services..."
curl -s -X GET "$API_URL/services/" -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool

# --- List Bookings ---
echo "Listing Bookings..."
curl -s -X GET "$API_URL/bookings/" -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool

# --- List Payments ---
echo "Listing Payments..."
curl -s -X GET "$API_URL/payments/" -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
