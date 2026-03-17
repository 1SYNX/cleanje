import { db } from './supabase.js';
import { loadDropdown } from './utils.js';

// ==============================
// LOAD ALL DROPDOWNS FROM DB
// ==============================

loadDropdown('ref_customer_type', 'customerType');
loadDropdown('ref_time_slot', 'timeSlot');
loadDropdown('ref_booking_source', 'source');
loadDropdown('ref_booking_status', 'status');
loadDropdown('ref_technician_crew', 'crew');

// ==============================
// LOAD SERVICE PACKAGES
// ==============================

async function loadPackages(){
  const { data, error } = await db
    .from('package_service_details')
    .select('*');

  if(error){
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
// AUTO SHOW PACKAGE PRICE
// ==============================

document.getElementById('package').addEventListener('change', async function(){
  const code = this.value;

  if(!code) return;

  const { data } = await db
    .from('package_service_details')
    .select('*')
    .eq('code', code)
    .single();

  if(data){
    const priceField = document.getElementById('price');
    if(priceField){
      priceField.value = data.grand_total_selling_rm;
    }
  }
});

// ==============================
// SUBMIT BOOKING
// ==============================

window.submitBooking = async function(){

  const data = {
    customer_name: document.getElementById('name').value,
    vehicle_plate: document.getElementById('plate').value,
    customer_type: document.getElementById('customerType').value,
    service_id_category: document.getElementById('package').value,
    service_charge_rm: document.getElementById('price')?.value || null,
    date: document.getElementById('date').value,
    time_slot: document.getElementById('timeSlot').value,
    assigned_crew: document.getElementById('crew').value,
    booking_source: document.getElementById('source').value,
    booking_status: document.getElementById('status').value,
    service_address: document.getElementById('address').value,
    remarks: document.getElementById('remarks')?.value || null
  };

  // 🔍 Basic validation
  if(!data.customer_name || !data.vehicle_plate){
    alert("Please fill required fields");
    return;
  }

  const { data: result, error } = await db
    .from('customer_booking_register')
    .insert([data])
    .select();

  if(error){
    console.error(error);
    alert("Error: " + error.message);
    return;
  }

  // ✅ Get generated booking ID
  const bookingId = result[0].booking_id;

  // Show on UI
  document.getElementById('bookingId').innerText = bookingId;

  // Save for Job Sheet usage
  localStorage.setItem("booking_id", bookingId);

  alert("Booking Created: " + bookingId);
};
