# Cleanje Booking System

A mobile-first frontend project for GitHub Pages with Supabase integration.

## Pages

- `index.html` → Booking page (landing page)
- `job.html` → Job update page (reuses `booking_id` from localStorage)
- `payment.html` → Payment page (reuses `booking_id` from localStorage)

## Features

- No login page; starts directly on booking form.
- Auto-generated booking ID format: `CIJYYYYMMDD-XXX`.
- Booking ID displayed after submission.
- Booking ID stored in `localStorage` key `booking_id`.
- Supabase write integration for booking, job, and payment modules.
- Responsive card-based UI.

## Supabase tables expected

The app is configured to insert into:

- `customer_booking_register`
- `job_register`
- `payment_register`

If your table names differ, update `TABLES` in `app.js`.

## Local run

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploy to GitHub Pages

1. Push this repository to GitHub.
2. Go to **Settings → Pages**.
3. Set source to your main branch root.
4. Save and open the generated Pages URL.
