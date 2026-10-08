# Contributing to Spa Management

Thanks for helping improve this Django REST Framework + React spa booking MVP.

## Local checks

Follow the setup steps in [README.md](README.md) before editing. Keep API and frontend changes scoped to one feature.

For backend changes, run the project's Django tests from the backend directory using the active virtual environment:

```bash
python manage.py check
python manage.py test
```

For frontend changes, install dependencies in the frontend directory and run the build command defined in its package.json.

## Booking and payment safeguards

- Verify appointment availability server-side; never rely only on a frontend calendar.
- Test conflicting bookings, time zones, authorization, and cancellation edge cases.
- Keep client and therapist records restricted to authorized users.
- Never commit payment credentials, access tokens, personal customer data, or real receipts.
- Use sandbox/test payment flows; do not initiate live payments while testing.
- Document any migration or environment-variable changes.

## Pull request checklist

- [ ] Changes are small and described clearly
- [ ] Relevant backend tests pass
- [ ] Frontend build checked if UI changed
- [ ] Authorization and booking overlap behavior reviewed
- [ ] No secrets or personal data included
- [ ] Screenshots provided for visual changes

Please report suspected security issues privately to the maintainer rather than posting credentials or exploit details in a public issue.
