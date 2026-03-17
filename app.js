const SUPABASE_URL = "https://fssybhcybzfcheivvsia.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzc3liaGN5YnpmY2hlaXZ2c2lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMTg4NDEsImV4cCI6MjA4ODY5NDg0MX0.oc7jjEjWlB6GtshhAToYkOSdlsdX-jMLqcx3XYYj3rU";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function submitBooking(){

  const data = {
    customer_name: document.getElementById('name').value,
    vehicle_plate: document.getElementById('plate').value,
    customer_type: document.getElementById('customerType').value,
    service_id_category: document.getElementById('package').value,
    date: document.getElementById('date').value,
    time_slot: document.getElementById('timeSlot').value,
    assigned_crew: document.getElementById('crew').value,
    booking_source: document.getElementById('source').value,
    booking_status: document.getElementById('status').value,
    service_address: document.getElementById('address').value
  };

  const { data: res, error } = await db
    .from('customer_booking_register')
    .insert([data])
    .select();

  if(error){
    alert(error.message);
  } else {
    const id = res[0].booking_id;
    document.getElementById('bookingId').innerText = id;

    localStorage.setItem("booking_id", id);
  }
}
