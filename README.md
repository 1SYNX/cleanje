# Cleanje Booking System

Mobile-first frontend for GitHub Pages connected to Supabase.

## Pages

- `index.html` → Booking page (landing page)
- `job.html` → Job sheet page
- `payment.html` → Payment sheet page

## Supabase tables used

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

## Schema alignment implemented

### `customer_booking_register`
Inserted columns:
`booking_id`, `date`, `month`, `year`, `customer_type`, `vehicle_plate`, `customer_name`, `contact_no`, `email`, `service_address`, `service_id_category`, `service_charge_rm`, `time_slot`, `time`, `assigned_crew`, `booking_source`, `booking_status`, `remarks`.

### `job_sheet`
Inserted columns:
`booking_id`, `mileage_km`, `on_site_condition`, `job_status`, `technician_remarks`.

### `payment_sheet`
Inserted columns:
`booking_id`, `amount_paid_rm`, `payment_method`, `payment_status`.

## Features

- No login page.
- Booking ID format: `CIJYYYYMMDD-XXX`.
- Booking ID shown before submit and after submit.
- Booking ID saved in `localStorage` as `booking_id`.
- Job page can select existing `booking_id` from database.
- Dropdowns load dynamically from reference tables (fallback to default HTML options if unavailable).

## Local run

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`.
