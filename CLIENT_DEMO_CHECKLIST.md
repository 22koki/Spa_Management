# Client Demo Checklist

## Before the meeting

- Pull the latest branch and confirm `git status` is clean.
- Copy `backend/.env.example` to `backend/.env` and set a local secret.
- Run migrations and `seed_demo --confirm`.
- Run `manage.py check`, `manage.py test spa`, and `npm run build`.
- Start backend on port 8000 and frontend on port 3000.
- Use an incognito window so saved roles/tokens do not affect the flow.
- Keep provider methods hidden unless their sandbox callbacks are configured.

## Five-minute story

1. Public customer: choose a service, practitioner, date/time, WhatsApp reminder, and create a booking.
2. Owner: show **Today** and open each attention arrow.
3. Owner: show service pricing, deposits, tax, brand, and policy settings.
4. Reception: confirm a cash/Till payment and open the receipt.
5. Practitioner: open the assigned schedule and progress the appointment.
6. Owner/reception: open the client record and show safety warnings and visit history.

## Never claim

- A gateway payment is live until its signed callback has passed sandbox testing.
- Automatic WhatsApp delivery is live until the approved template and scheduled worker are configured.
- Phase-two packages, memberships, inventory, payroll, campaigns, or subscription billing are finished.

## Success questions for the client

- Who confirms bookings and payments today?
- How much cancellation notice do you require?
- Which treatments require special skills, rooms, or cleanup buffers?
- Which payment methods must be live at launch?
- Do you already have a Meta WhatsApp Business account and approved templates?
- Which reports do you review daily and monthly?
