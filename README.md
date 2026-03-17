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
- Job page can load/select existing bookings and auto-populate customer name, vehicle plat, service category, and booking date.
- Responsive card-based UI.

## Supabase setup note

This frontend uses `supabase.auth.signInAnonymously()` automatically (no login page) so inserts can pass RLS policies that allow the `authenticated` role. In Supabase, enable **Authentication → Providers → Anonymous Sign-Ins** and ensure your insert policies allow `authenticated` users.

## Supabase tables expected

The app is configured to use:

- `customer_booking_register`
- `job_sheet`
- `payment_sheet`
- `package_service_details`
- `ref_booking_source`
- `ref_booking_status`
- `ref_condition`
- `ref_customer_type`
- `ref_job_status`
- `ref_payment_status`
- `ref_technician_crew`
- `ref_time_slot`

If your table names differ, update `TABLES` / `REF_TABLES` in `app.js`.


## Booking register field mapping

The Booking page now inserts using these customer register column names:

- `Booking ID`, `Setmore ID`, `Date`, `Month`, `Year`
- `Customer Type`, `Vehicle Plat`, `Customer Name`, `Contact No`, `Email`
- `Service Address`, `Service ID Category`, `Service Charge (RM)`
- `Time Slot`, `Time`, `Assigned Crew`, `Booking Source`, `Booking Status`, `Remarks`

## Job sheet field mapping

The Job page now follows your table columns and inserts with these exact keys:

- `Booking ID`, `Setmore ID`, `Service ID Category`, `Date`, `Month`, `Year`
- `Vehicle Plat`, `Customer Name`, `Toll [RM]`, `Mileage [KM]`
- `Start Time`, `End Time`, `Duration (hrs)`, `On-Site Condition`, `Dry Ice Used (KG)`
- `Air Compressor Fuel Top up [YES/NO]`, `Air Compressor Fuel Top up [Volumn/L]`
- `Generator Fuel Top up [YES/NO]`, `Generator Fuel Top up [Volumn/L]`
- `Pre-Service Photo Ref`, `Post-Service Photo Ref`, `Post-Service Video Ref`
- `Job Status`, `Receipt Issued`, `Technician Remarks`

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
