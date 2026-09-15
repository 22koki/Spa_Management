# Spa Management MVP

A full-stack spa booking MVP for clients, therapists, services, appointments, and payments. It pairs a Django REST API with a React single-page app and JWT authentication.

## MVP capabilities

- Register and sign in as a client
- Browse spa services and active therapists
- Book a future service appointment
- Prevent overlapping appointments for the same therapist
- Scope booking visibility to each client's or therapist's own records
- Give admins access to all bookings
- Record payments against bookings

## Stack

- Backend: Python 3.10+, Django 5, Django REST Framework, Simple JWT, PostgreSQL
- Frontend: React 19, React Router, Axios

## Project layout

```text
backend/                 Django API
  spa/                   Domain models, API views, serializers, tests
  spa_backend/           Project settings and root URLs
frontend/spa-frontend/   React application
```

## Local setup

### 1. Database

Create a PostgreSQL database and user matching the development settings in `backend/spa_backend/settings.py`. Never use development credentials in production.

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

The API runs at `http://127.0.0.1:8000/api/`.

### 3. Frontend

In a second terminal:

```bash
cd frontend/spa-frontend
npm ci
npm start
```

The app runs at `http://localhost:3000`.

## Core API

| Method | Path | Purpose | Authentication |
| --- | --- | --- | --- |
| POST | `/api/auth/register/` | Register a client account | Public |
| POST | `/api/auth/login/` | Obtain JWT access/refresh tokens | Public |
| GET | `/api/services/` | List services | Public |
| GET | `/api/users/therapists/` | List active therapists | JWT |
| GET | `/api/bookings/` | List role-scoped bookings | JWT |
| POST | `/api/bookings/` | Create a booking | Client JWT |
| POST | `/api/payments/` | Create a payment | Current MVP endpoint |

Send authenticated requests with `Authorization: Bearer <access-token>`.

## Booking security rules

The API, rather than the browser, assigns the authenticated client and initial `pending` status. It rejects past appointments, non-therapist assignees, and overlapping active appointments. Booking lists are scoped by role, and creation is limited to client accounts. A database constraint provides a final guard against duplicate active start times.

## Tests

From `backend/` with a test database available:

```bash
python manage.py test spa
```

The suite covers authentication, ownership enforcement, role-based visibility, therapist validation, and overlap rejection.

## MVP limitations / next steps

- Add refresh-token handling and logout/token revocation
- Restrict service, user, payment, and booking-status administration by role
- Move secrets and database credentials to environment variables before deployment
- Add therapist working hours, time-zone-aware availability, cancellation, and rescheduling
- Add CORS configuration when frontend and API use different origins
- Remove committed virtual-environment files and rotate credentials previously committed to Git history
