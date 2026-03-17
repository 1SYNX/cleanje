# Cleanje Booking System

Clean, schema-aligned frontend for GitHub Pages + Supabase.

## Pages

- `index.html` → `customer_booking_register` form
- `job.html` → `job_sheet` form
- `payment.html` → `payment_sheet` form

## Supabase tables wired

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

## Exact schema mapping

### customer_booking_register
Form includes all user-entered fields:
- `booking_id` (auto preview + saved)
- `date`, `month`, `year`
- `customer_type`, `vehicle_plate`, `customer_name`, `contact_no`, `email`
- `service_address`, `service_id_category`, `service_charge_rm`
- `time_slot`, `time`, `assigned_crew`, `booking_source`, `booking_status`, `remarks`
- `created_at` shown as readonly after save

### job_sheet
Form includes:
- `id` (readonly after save)
- `booking_id`
- `mileage_km`
- `on_site_condition`
- `job_status`
- `technician_remarks`
- `created_at` (readonly after save)

### payment_sheet
Form includes:
- `id` (readonly after save)
- `booking_id`
- `amount_paid_rm`
- `payment_method`
- `payment_status`
- `created_at` (readonly after save)

## Notes

- Booking ID format: `CIJYYYYMMDD-XXX`
- Booking list for Job page loads from `customer_booking_register.booking_id`
- Dropdowns try loading from reference tables; HTML fallback options remain if ref reads fail.

## Run

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`.
