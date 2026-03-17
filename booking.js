import { db } from './supabase.js';
import { loadDropdown } from './utils.js';

// ==============================
// LOAD DROPDOWNS FROM DB
// ==============================

loadDropdown('ref_customer_type', 'customerType');
loadDropdown('ref_time_slot', 'timeSlot');
loadDropdown('ref_booking_source', 'source');
loadDropdown('ref_booking_status', 'status');
loadDropdown('ref_technician_crew', 'crew');

// ==============================
// LOAD SERVICE PACKAGES
// ==============================

async function loadPackages() {
  const { data, error } = await db
    .from('package_service_details')
    .select('*');

  if (error) {
    console.error("Error loading packages:", error);
    return;
  }

  const el = document.getElementById('package');
  el.innerHTML = '<option value="">Select Package</option>';

  data.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.code;
    opt.text = `${p.package_name} - RM${p.grand_total_selling_rm}`;
    el.appendChild(opt);
  });
}

loadPackages();

// ==============================
// AUTO FILL PRICE
// ==============================

document.getElementById('package').addEventListener('change', async function () {
  const code = this.value;
  if (!code) return;

  const { data } = await db
    .from('package_service_details')
    .select('*')
    .eq('code', code)
    .single();

  if (data) {
    const priceField = document.getElementById('price');
    if (priceField) {
      priceField.value = data.grand_total_selling_rm;
    }
  }
});

// ==============================
// AUTO MONTH & YEAR FROM DATE ✅
// ==============================

document.getElementById('date').addEventListener('change', function () {
  const d = new Date(this.value);

  if (isNaN(d)) return;

  document.getElementById('bookingMonth').value =
    d.toLocaleString('default', { month: 'long' });

  document.getElementById('bookingYear').value = d.getFullYear();
});

// ==============================
// SUBMIT BOOKING
// ==============================

document.getElementById('bookingForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const data = {
    customer_name: document.getElementById('name').value,
    vehicle_plate: document.getElementById('plate').value,
    customer_type: document.getElementById('customerType').value,
    service_id_category: document.getElementById('package').value,
    service_charge_rm: document.getElementById('price').value,
    date: document.getElementById('date').value,
    month: document.getElementById('bookingMonth').value,
    year: document.getElementById('bookingYear').value,
    time_slot: document.getElementById('timeSlot').value,
    time: document.getElementById('bookingTime').value,
    assigned_crew: document.getElementById('crew').value,
    booking_source: document.getElementById('source').value,
    booking_status: document.getElementById('status').value,
    service_address: document.getElementById('address').value,
    contact_no: document.getElementById('contactNo').value,
    email: document.getElementById('email').value,
    remarks: document.getElementById('remarks').value
  };

  // Basic validation
  if (!data.customer_name || !data.vehicle_plate || !data.date) {
    alert("Please fill required fields");
    return;
  }

  const { data: result, error } = await db
    .from('customer_booking_register')
    .insert([data])
    .select();

  if (error) {
    console.error(error);
    document.getElementById('message').innerText = "Error: " + error.message;
    return;
  }

  // Get generated booking ID
  const bookingId = result[0].booking_id;

  // Display booking ID
  document.getElementById('bookingId').innerText = bookingId;
  document.getElementById('bookingIdInput').value = bookingId;

  // Store for job page
  localStorage.setItem("booking_id", bookingId);

  document.getElementById('message').innerText = "Booking created successfully!";
});
