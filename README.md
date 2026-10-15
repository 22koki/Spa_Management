# Spa Management

A mobile-friendly spa operating system with three connected experiences:

- Owner and reception workspace for today’s priorities, appointments, team capacity, clients, services, payments, and settings
- Practitioner workspace for assigned schedules and service-delivery status updates
- Branded public booking and customer dashboard for self-service appointments, payments, receipts, reminders, cancellation, and rebooking

The first release is intentionally focused on workflows that make or protect revenue.

## Sellable MVP included

- Public branded online booking without requiring a customer to sign in first
- Customer registration and JWT sign-in
- Owner, manager, receptionist, practitioner, therapist, admin, and client roles
- Role-aware menus, data access, and actions
- Services with duration, price, deposit, cleanup buffer, preparation, aftercare, add-ons, and required skills
- Team accounts, weekly availability, breaks, approved time off, locations, rooms, and equipment
- Server-side conflict protection for practitioner time, room time, cleanup buffers, working hours, breaks, time off, and required skills
- Client profiles with visit history, preferences, allergies, contraindications, private notes, consent, and loyalty points
- Appointment statuses: pending, booked, confirmed, arrived, completed, cancelled, and no-show
- Configurable cancellation/no-show policy
- Deposits or full checkout with tax and optional tip
- Cash and M-PESA Till verification by authorized staff
- M-PESA STK and Flutterwave card gateway hooks when sandbox credentials are configured
- Branded printable receipts
- Action-first daily dashboard with sales, appointments, utilization, no-shows, confirmations, and rebooking follow-up
- WhatsApp opt-in during booking, manual pre-filled customer chats, and automatic template reminder delivery
- Business branding, contact details, currency, tax, cancellation policy, and integration readiness settings
- Audit records for managed changes
- Multi-location models even when the first release exposes one main location
- Idempotent presentation data command

## Technology

- Backend: Python 3.10+, Django 5.2, Django REST Framework, Simple JWT
- Database: SQLite for local development; PostgreSQL through `DATABASE_URL` in deployment
- Frontend: React 19, React Router, Axios

## Start locally on Windows PowerShell

### 1. Backend

```powershell
cd C:\Users\MAKAVELI\Spa_Management\backend
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Open `backend\.env` and keep these local values:

```env
DJANGO_SECRET_KEY=replace-this-with-a-long-random-local-secret
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost
```

Then prepare the database and demo:

```powershell
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py seed_demo --confirm
.\.venv\Scripts\python.exe manage.py runserver
```

The API will run at `http://127.0.0.1:8000/api/`.

### 2. Frontend

Open a second PowerShell window:

```powershell
cd C:\Users\MAKAVELI\Spa_Management\frontend\spa-frontend
Copy-Item .env.example .env
npm install
npm start
```

Open `http://localhost:3000`. The public booking page is the default landing page.

## Demo accounts

Run `seed_demo --confirm` as many times as needed; it is safe to repeat.

| Experience | Username | Password |
| --- | --- | --- |
| Owner | `owner_demo` | `SpaDemo2026!` |
| Reception | `reception_demo` | `SpaDemo2026!` |
| Practitioner | `practitioner_demo` | `SpaDemo2026!` |
| Customer | `client_demo` | `SpaDemo2026!` |

Set `DEMO_PASSWORD` before running the command if you want a different shared demo password.

Suggested demo order:

1. Open the public booking page and show the treatment/time/customer flow.
2. Sign in as `owner_demo` and open **Today** to show actionable attention cards.
3. Open **Team & Rooms** to show schedules, breaks, time off, locations, and resources.
4. Open **Clients** to show allergy and contraindication warnings plus visit history.
5. Open **Payments**, mark the seeded cash payment as paid, and open its branded receipt.
6. Sign in as `practitioner_demo` and progress an appointment from confirmed to arrived to completed.

## Payment behavior

Only methods that are ready appear to customers:

- Cash and M-PESA Till are always available and remain pending until reception verifies them.
- M-PESA STK appears after all `MPESA_*` variables in `backend/.env` are configured.
- Card appears after `FLW_SECRET_KEY` and `FLW_REDIRECT_URL` are configured.
- Gateway payments become paid only from a verified callback; the browser cannot self-confirm them.

Use sandbox credentials until both successful and failed callback flows have been tested on a public HTTPS deployment. Payment amount, deposit, tax, and receipt state are owned by the server.

## WhatsApp reminders

Manual WhatsApp contact works when the business WhatsApp number is saved under **Settings**.

For automatic reminders, configure the Meta WhatsApp Cloud API values in `backend/.env`:

```env
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_TEMPLATE_NAME=appointment_reminder
WHATSAPP_TEMPLATE_LANGUAGE=en
WHATSAPP_GRAPH_VERSION=v26.0
```

The approved template must accept these body values in order: customer name, service, appointment date, and appointment time.

Run due reminders manually:

```powershell
.\.venv\Scripts\python.exe manage.py send_due_reminders
```

For deployment, schedule this command every five minutes using the host’s cron/background-worker service. Failed deliveries are retained with an attempt count and error message and retry up to three times.

## Verification

Backend:

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py test spa
```

Frontend:

```powershell
cd frontend\spa-frontend
npm run build
```

The current automated suite contains 24 backend workflow/security tests, and the React production build must compile without errors before release.

## Production checklist

- Set `DJANGO_DEBUG=False` and a new high-entropy `DJANGO_SECRET_KEY`.
- Set the deployed API hostname in `DJANGO_ALLOWED_HOSTS`.
- Set exact frontend domains in `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS`.
- Use managed PostgreSQL through `DATABASE_URL`.
- Set `REACT_APP_API_URL` to the public HTTPS API before building the frontend.
- Configure public HTTPS payment callback URLs and provider webhook secrets.
- Configure the WhatsApp template and recurring reminder worker.
- Create named staff accounts; do not share the demo password in production.
- Back up the database and verify restore, payment callback, reminder, cancellation, and receipt flows.
- Run `python manage.py check --deploy` against the production environment.

## API highlights

| Method | Path | Purpose | Access |
| --- | --- | --- | --- |
| GET | `/api/business/` | Public brand, policy, and ready payment methods | Public |
| PATCH | `/api/business/` | Update business configuration | Owner/manager/admin |
| POST | `/api/auth/register/` | Register a customer | Public |
| POST | `/api/auth/login/` | Obtain access and refresh tokens | Public |
| GET/PATCH | `/api/auth/me/` | Current account profile | Authenticated |
| GET | `/api/services/` | Public treatment catalogue | Public |
| GET | `/api/users/therapists/` | Active practitioners | Public |
| GET/POST | `/api/bookings/` | Role-scoped appointment list or customer booking | Authenticated |
| PATCH | `/api/bookings/{id}/status/` | Authorized workflow/cancellation update | Authenticated |
| GET/POST | `/api/payments/` | Role-scoped payments or checkout | Authenticated |
| POST | `/api/payments/{id}/confirm/` | Verify cash or Till payment | Authorized staff |
| GET | `/api/reports/dashboard/` | Operational dashboard | Owner/manager/reception |

## Scope boundary

This repository is a complete first sellable release, not the entire long-term product roadmap. Packages, recurring memberships, gift-card liability, inventory purchasing, payroll execution, marketing campaigns, media consent storage, and full subscription billing should be built as separate production modules after real client validation. Their financial and privacy rules should not be represented by non-functional demo buttons.
