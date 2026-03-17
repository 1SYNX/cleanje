const SUPABASE_URL = "https://fssybhcybzfcheivvsia.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzc3liaGN5YnpmY2hlaXZ2c2lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMTg4NDEsImV4cCI6MjA4ODY5NDg0MX0.oc7jjEjWlB6GtshhAToYkOSdlsdX-jMLqcx3XYYj3rU";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const TABLES = {
  booking: "customer_booking_register",
  job: "job_register",
  payment: "payment_register",
};

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

function setMessage(targetId, text, type = "") {
  const el = document.getElementById(targetId);
  if (!el) return;
  el.textContent = text;
  el.className = `result ${type}`.trim();
}

function fillBookingIdFields() {
  const id = localStorage.getItem("booking_id") || "";
  const output = document.getElementById("bookingId");
  const jobBookingId = document.getElementById("jobBookingId");
  const paymentBookingId = document.getElementById("paymentBookingId");

  if (output && id) output.textContent = id;
  if (jobBookingId && id) jobBookingId.value = id;
  if (paymentBookingId && id) paymentBookingId.value = id;
}

async function generateBookingId() {
  const now = new Date();
  const y = String(now.getFullYear());
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const prefix = `CIJ${y}${m}${d}`;

  const { data, error } = await db
    .from(TABLES.booking)
    .select("booking_id")
    .like("booking_id", `${prefix}-%`)
    .order("booking_id", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Unable to generate booking ID: ${error.message}`);
  }

  const lastId = data?.[0]?.booking_id;
  const nextNumber = lastId ? Number(lastId.split("-")[1]) + 1 : 1;
  return `${prefix}-${String(nextNumber).padStart(3, "0")}`;
}

async function submitBooking(event) {
  event.preventDefault();

  try {
    setMessage("message", "Submitting booking...");
    const bookingId = await generateBookingId();

    const payload = {
      booking_id: bookingId,
      customer_name: document.getElementById("name").value.trim(),
      vehicle_plate: document.getElementById("plate").value.trim(),
      customer_type: document.getElementById("customerType").value,
      service_id_category: document.getElementById("package").value,
      date: document.getElementById("date").value,
      time_slot: document.getElementById("timeSlot").value,
      assigned_crew: document.getElementById("crew").value,
      booking_source: document.getElementById("source").value,
      booking_status: document.getElementById("status").value,
      service_address: document.getElementById("address").value.trim(),
    };

    const { error } = await db.from(TABLES.booking).insert([payload]);

    if (error) {
      throw error;
    }

    document.getElementById("bookingId").textContent = bookingId;
    localStorage.setItem("booking_id", bookingId);
    setMessage("message", `Booking submitted. Your booking ID is ${bookingId}.`, "success");
    event.target.reset();
    document.getElementById("date").value = getTodayString();
  } catch (err) {
    setMessage("message", err.message, "error");
  }
}

async function submitJob(event) {
  event.preventDefault();
  const bookingId = document.getElementById("jobBookingId").value.trim();

  const payload = {
    booking_id: bookingId,
    technician: document.getElementById("jobTechnician").value,
    job_status: document.getElementById("jobStatus").value,
    visit_date: document.getElementById("jobDate").value,
    notes: document.getElementById("jobNotes").value.trim(),
  };

  const { error } = await db.from(TABLES.job).insert([payload]);
  if (error) {
    setMessage("jobMessage", `Unable to save job update: ${error.message}`, "error");
    return;
  }

  localStorage.setItem("booking_id", bookingId);
  setMessage("jobMessage", "Job update saved successfully.", "success");
  event.target.reset();
  fillBookingIdFields();
}

async function submitPayment(event) {
  event.preventDefault();
  const bookingId = document.getElementById("paymentBookingId").value.trim();

  const payload = {
    booking_id: bookingId,
    amount: Number(document.getElementById("paymentAmount").value),
    method: document.getElementById("paymentMethod").value,
    payment_status: document.getElementById("paymentStatus").value,
    payment_date: document.getElementById("paymentDate").value,
    remarks: document.getElementById("paymentRemarks").value.trim(),
  };

  const { error } = await db.from(TABLES.payment).insert([payload]);
  if (error) {
    setMessage("paymentMessage", `Unable to save payment: ${error.message}`, "error");
    return;
  }

  localStorage.setItem("booking_id", bookingId);
  setMessage("paymentMessage", "Payment saved successfully.", "success");
  event.target.reset();
  fillBookingIdFields();
}

function setupPage() {
  fillBookingIdFields();

  const bookingForm = document.getElementById("bookingForm");
  const jobForm = document.getElementById("jobForm");
  const paymentForm = document.getElementById("paymentForm");
  const dateInputIds = ["date", "jobDate", "paymentDate"];

  dateInputIds.forEach((id) => {
    const dateInput = document.getElementById(id);
    if (dateInput && !dateInput.value) dateInput.value = getTodayString();
  });

  if (bookingForm) bookingForm.addEventListener("submit", submitBooking);
  if (jobForm) jobForm.addEventListener("submit", submitJob);
  if (paymentForm) paymentForm.addEventListener("submit", submitPayment);
}

document.addEventListener("DOMContentLoaded", setupPage);
