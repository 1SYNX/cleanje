const SUPABASE_URL = "https://fssybhcybzfcheivvsia.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzc3liaGN5YnpmY2hlaXZ2c2lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMTg4NDEsImV4cCI6MjA4ODY5NDg0MX0.oc7jjEjWlB6GtshhAToYkOSdlsdX-jMLqcx3XYYj3rU";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const TABLES = {
  booking: "customer_booking_register",
  job: "job_register",
  payment: "payment_register",
};

let authReady = false;
let bookingCache = [];

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

async function ensureSupabaseAuth() {
  if (authReady) return;

  const {
    data: { session },
    error: sessionError,
  } = await db.auth.getSession();

  if (sessionError) {
    throw new Error(`Unable to initialize Supabase session: ${sessionError.message}`);
  }

  if (!session) {
    const { error: signInError } = await db.auth.signInAnonymously();

    if (signInError) {
      throw new Error(
        `Unable to access booking service. Enable Supabase Anonymous Auth and authenticated RLS insert policy. ${signInError.message}`,
      );
    }
  }

  authReady = true;
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
    await ensureSupabaseAuth();
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
    if (error) throw error;

    document.getElementById("bookingId").textContent = bookingId;
    localStorage.setItem("booking_id", bookingId);
    setMessage("message", `Booking submitted. Your booking ID is ${bookingId}.`, "success");
    event.target.reset();
    document.getElementById("date").value = getTodayString();
  } catch (err) {
    setMessage("message", err.message, "error");
  }
}

function syncJobDateParts() {
  const dateInput = document.getElementById("jobDate");
  const monthInput = document.getElementById("jobMonth");
  const yearInput = document.getElementById("jobYear");
  if (!dateInput || !monthInput || !yearInput || !dateInput.value) return;

  const dateObj = new Date(dateInput.value);
  monthInput.value = String(dateObj.getMonth() + 1).padStart(2, "0");
  yearInput.value = String(dateObj.getFullYear());
}

function syncJobDuration() {
  const startInput = document.getElementById("jobStartTime");
  const endInput = document.getElementById("jobEndTime");
  const durationInput = document.getElementById("jobDuration");
  if (!startInput || !endInput || !durationInput || !startInput.value || !endInput.value) return;

  const [sh, sm] = startInput.value.split(":").map(Number);
  const [eh, em] = endInput.value.split(":").map(Number);
  let startMinutes = sh * 60 + sm;
  let endMinutes = eh * 60 + em;
  if (endMinutes < startMinutes) endMinutes += 24 * 60;
  const duration = (endMinutes - startMinutes) / 60;
  durationInput.value = duration.toFixed(2);
}

function fillJobFormFromBooking(booking) {
  if (!booking) return;

  const setValue = (id, value) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = value || "";
  };

  setValue("jobBookingId", booking.booking_id);
  setValue("jobCustomerName", booking.customer_name);
  setValue("jobVehiclePlat", booking.vehicle_plate);
  setValue("jobDate", booking.date || getTodayString());

  const serviceSelect = document.getElementById("jobServiceCategory");
  if (serviceSelect && booking.service_id_category) {
    const exists = Array.from(serviceSelect.options).some((option) => option.value === booking.service_id_category);
    if (exists) serviceSelect.value = booking.service_id_category;
  }

  localStorage.setItem("booking_id", booking.booking_id || "");
  syncJobDateParts();
}

async function loadBookingOptions() {
  const selector = document.getElementById("jobBookingSelector");
  if (!selector) return;

  await ensureSupabaseAuth();
  const { data, error } = await db
    .from(TABLES.booking)
    .select("booking_id, customer_name, vehicle_plate, date, service_id_category")
    .order("date", { ascending: false })
    .limit(200);

  if (error) {
    setMessage("jobMessage", `Unable to load bookings: ${error.message}`, "error");
    return;
  }

  bookingCache = data || [];

  selector.innerHTML = '<option value="">Select booking ID...</option>';
  bookingCache.forEach((booking) => {
    const option = document.createElement("option");
    option.value = booking.booking_id;
    option.textContent = `${booking.booking_id} - ${booking.customer_name || "No Name"}`;
    selector.appendChild(option);
  });

  const localId = localStorage.getItem("booking_id") || "";
  if (localId) {
    selector.value = localId;
    const selected = bookingCache.find((item) => item.booking_id === localId);
    if (selected) fillJobFormFromBooking(selected);
  }
}

function onJobBookingSelected(event) {
  const selectedId = event.target.value;
  if (!selectedId) return;

  const selected = bookingCache.find((item) => item.booking_id === selectedId);
  if (!selected) {
    setMessage("jobMessage", "Selected booking details not found.", "error");
    return;
  }

  fillJobFormFromBooking(selected);
  setMessage("jobMessage", `Loaded booking ${selectedId} details into job sheet.`, "success");
}

async function submitJob(event) {
  event.preventDefault();
  const bookingId = document.getElementById("jobBookingId").value.trim();

  try {
    await ensureSupabaseAuth();

    const payload = {
      "Booking ID": bookingId,
      "Setmore ID": document.getElementById("jobSetmoreId").value.trim(),
      "Service ID Category": document.getElementById("jobServiceCategory").value,
      Date: document.getElementById("jobDate").value,
      Month: document.getElementById("jobMonth").value,
      Year: document.getElementById("jobYear").value,
      "Vehicle Plat": document.getElementById("jobVehiclePlat").value.trim(),
      "Customer Name": document.getElementById("jobCustomerName").value.trim(),
      "Toll [RM]": Number(document.getElementById("jobToll").value || 0),
      "Mileage [KM]": Number(document.getElementById("jobMileage").value || 0),
      "Start Time": document.getElementById("jobStartTime").value,
      "End Time": document.getElementById("jobEndTime").value,
      "Duration (hrs)": Number(document.getElementById("jobDuration").value || 0),
      "On-Site Condition": document.getElementById("jobOnSiteCondition").value.trim(),
      "Dry Ice Used (KG)": Number(document.getElementById("jobDryIceUsed").value || 0),
      "Air Compressor Fuel Top up [YES/NO]": document.getElementById("jobAirCompressorFuelTopUp").value,
      "Air Compressor Fuel Top up [Volumn/L]": Number(document.getElementById("jobAirCompressorFuelTopUpVolume").value || 0),
      "Generator Fuel Top up [YES/NO]": document.getElementById("jobGeneratorFuelTopUp").value,
      "Generator Fuel Top up [Volumn/L]": Number(document.getElementById("jobGeneratorFuelTopUpVolume").value || 0),
      "Pre-Service Photo Ref": document.getElementById("jobPreServicePhotoRef").value.trim(),
      "Post-Service Photo Ref": document.getElementById("jobPostServicePhotoRef").value.trim(),
      "Post-Service Video Ref": document.getElementById("jobPostServiceVideoRef").value.trim(),
      "Job Status": document.getElementById("jobStatus").value,
      "Receipt Issued": document.getElementById("jobReceiptIssued").value,
      "Technician Remarks": document.getElementById("jobTechnicianRemarks").value.trim(),
    };

    const { error } = await db.from(TABLES.job).insert([payload]);
    if (error) throw error;

    localStorage.setItem("booking_id", bookingId);
    setMessage("jobMessage", "Job sheet saved successfully.", "success");
    event.target.reset();
    const dateInput = document.getElementById("jobDate");
    if (dateInput) dateInput.value = getTodayString();
    syncJobDateParts();
    fillBookingIdFields();
  } catch (error) {
    setMessage("jobMessage", `Unable to save job sheet: ${error.message}`, "error");
  }
}

async function submitPayment(event) {
  event.preventDefault();
  const bookingId = document.getElementById("paymentBookingId").value.trim();

  try {
    await ensureSupabaseAuth();

    const payload = {
      booking_id: bookingId,
      amount: Number(document.getElementById("paymentAmount").value),
      method: document.getElementById("paymentMethod").value,
      payment_status: document.getElementById("paymentStatus").value,
      payment_date: document.getElementById("paymentDate").value,
      remarks: document.getElementById("paymentRemarks").value.trim(),
    };

    const { error } = await db.from(TABLES.payment).insert([payload]);
    if (error) throw error;

    localStorage.setItem("booking_id", bookingId);
    setMessage("paymentMessage", "Payment saved successfully.", "success");
    event.target.reset();
    fillBookingIdFields();
  } catch (error) {
    setMessage("paymentMessage", `Unable to save payment: ${error.message}`, "error");
  }
}

function setupPage() {
  fillBookingIdFields();

  const bookingForm = document.getElementById("bookingForm");
  const jobForm = document.getElementById("jobForm");
  const paymentForm = document.getElementById("paymentForm");
  const jobBookingSelector = document.getElementById("jobBookingSelector");
  const dateInputIds = ["date", "jobDate", "paymentDate"];

  dateInputIds.forEach((id) => {
    const dateInput = document.getElementById(id);
    if (dateInput && !dateInput.value) dateInput.value = getTodayString();
  });

  const jobDateInput = document.getElementById("jobDate");
  const jobStartInput = document.getElementById("jobStartTime");
  const jobEndInput = document.getElementById("jobEndTime");
  if (jobDateInput) jobDateInput.addEventListener("change", syncJobDateParts);
  if (jobStartInput) jobStartInput.addEventListener("change", syncJobDuration);
  if (jobEndInput) jobEndInput.addEventListener("change", syncJobDuration);
  if (jobBookingSelector) jobBookingSelector.addEventListener("change", onJobBookingSelected);
  syncJobDateParts();

  ensureSupabaseAuth()
    .then(() => loadBookingOptions())
    .catch((err) => {
      setMessage("message", err.message, "error");
      setMessage("jobMessage", err.message, "error");
      setMessage("paymentMessage", err.message, "error");
    });

  if (bookingForm) bookingForm.addEventListener("submit", submitBooking);
  if (jobForm) jobForm.addEventListener("submit", submitJob);
  if (paymentForm) paymentForm.addEventListener("submit", submitPayment);
}

document.addEventListener("DOMContentLoaded", setupPage);
