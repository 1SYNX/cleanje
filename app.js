const SUPABASE_URL = "https://fssybhcybzfcheivvsia.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzc3liaGN5YnpmY2hlaXZ2c2lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMTg4NDEsImV4cCI6MjA4ODY5NDg0MX0.oc7jjEjWlB6GtshhAToYkOSdlsdX-jMLqcx3XYYj3rU";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const TABLES = {
  booking: "customer_booking_register",
  job: "job_sheet",
  payment: "payment_sheet",
  package: "package_service_details",
};

const REF_TABLES = {
  customerType: "ref_customer_type",
  timeSlot: "ref_time_slot",
  bookingSource: "ref_booking_source",
  bookingStatus: "ref_booking_status",
  condition: "ref_condition",
  jobStatus: "ref_job_status",
  paymentStatus: "ref_payment_status",
  crew: "ref_technician_crew",
};

let authReady = false;
let bookingCache = [];

function setMessage(id, text, type = "") {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className = `result ${type}`.trim();
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getPrefix(dateString) {
  const source = dateString || getToday();
  const [y, m, d] = source.split("-");
  return `CIJ${y}${m}${d}`;
}

function syncBookingDateParts() {
  const dateInput = document.getElementById("date");
  const monthInput = document.getElementById("bookingMonth");
  const yearInput = document.getElementById("bookingYear");
  if (!dateInput || !monthInput || !yearInput || !dateInput.value) return;

  const dt = new Date(dateInput.value);
  monthInput.value = String(dt.getMonth() + 1).padStart(2, "0");
  yearInput.value = String(dt.getFullYear());
}

function fillSavedBookingId() {
  const id = localStorage.getItem("booking_id") || "";
  const bookingInput = document.getElementById("bookingIdInput");
  const bookingOut = document.getElementById("bookingId");
  const jobBookingId = document.getElementById("jobBookingId");
  const paymentBookingId = document.getElementById("paymentBookingId");

  if (bookingInput && id) bookingInput.value = id;
  if (bookingOut && id) bookingOut.textContent = id;
  if (jobBookingId && id) jobBookingId.value = id;
  if (paymentBookingId && id) paymentBookingId.value = id;
}

async function ensureSupabaseAuth() {
  if (authReady) return;
  const {
    data: { session },
    error: sessionError,
  } = await db.auth.getSession();

  if (sessionError) throw new Error(sessionError.message);

  if (!session) {
    const { error } = await db.auth.signInAnonymously();
    if (error) throw new Error(error.message);
  }

  authReady = true;
}

async function generateBookingId(dateString) {
  const prefix = getPrefix(dateString);

  const { data, error } = await db
    .from(TABLES.booking)
    .select("booking_id")
    .like("booking_id", `${prefix}-%`)
    .order("booking_id", { ascending: false })
    .limit(1);

  if (error) throw new Error(`Unable to generate booking ID: ${error.message}`);

  const lastId = data?.[0]?.booking_id;
  const seq = lastId ? Number(lastId.split("-")[1]) + 1 : 1;
  return `${prefix}-${String(seq).padStart(3, "0")}`;
}

async function refreshDraftBookingId() {
  const bookingInput = document.getElementById("bookingIdInput");
  const dateInput = document.getElementById("date");
  if (!bookingInput || !dateInput) return;

  await ensureSupabaseAuth();
  bookingInput.value = await generateBookingId(dateInput.value);
}

function pickRefValue(row) {
  return String(row?.value ?? row?.name ?? row?.label ?? "").trim();
}

async function fillSelectFromRef(selectId, tableName) {
  const select = document.getElementById(selectId);
  if (!select) return;

  const { data, error } = await db.from(tableName).select("*").limit(200);
  if (error || !data?.length) return;

  const values = [...new Set(data.map(pickRefValue).filter(Boolean))];
  if (!values.length) return;

  const current = select.value;
  select.innerHTML = "";
  values.forEach((value) => {
    const op = document.createElement("option");
    op.value = value;
    op.textContent = value;
    select.appendChild(op);
  });

  if (current && values.includes(current)) select.value = current;
}

async function fillPackageSelect() {
  const select = document.getElementById("package");
  const chargeInput = document.getElementById("serviceCharge");
  if (!select) return;

  const { data, error } = await db.from(TABLES.package).select("*").limit(200);
  if (error || !data?.length) return;

  const rows = data
    .map((row) => ({
      code: String(row.code ?? row.service_id_category ?? "").trim(),
      charge: row.charge_rm ?? row.service_charge_rm ?? row.amount_rm ?? row.price_rm ?? "",
    }))
    .filter((item) => item.code);

  if (!rows.length) return;

  const current = select.value;
  select.innerHTML = "";
  rows.forEach((item) => {
    const op = document.createElement("option");
    op.value = item.code;
    op.textContent = item.charge === "" ? item.code : `${item.code} - RM${item.charge}`;
    op.dataset.charge = item.charge;
    select.appendChild(op);
  });

  if (current && rows.some((r) => r.code === current)) select.value = current;

  const syncCharge = () => {
    const selected = select.options[select.selectedIndex];
    if (selected && chargeInput && selected.dataset.charge !== "") chargeInput.value = selected.dataset.charge;
  };

  syncCharge();
  select.addEventListener("change", syncCharge);
}

async function loadReferenceData() {
  await Promise.all([
    fillSelectFromRef("customerType", REF_TABLES.customerType),
    fillSelectFromRef("timeSlot", REF_TABLES.timeSlot),
    fillSelectFromRef("source", REF_TABLES.bookingSource),
    fillSelectFromRef("status", REF_TABLES.bookingStatus),
    fillSelectFromRef("crew", REF_TABLES.crew),
    fillSelectFromRef("jobOnSiteCondition", REF_TABLES.condition),
    fillSelectFromRef("jobStatus", REF_TABLES.jobStatus),
    fillSelectFromRef("paymentStatus", REF_TABLES.paymentStatus),
    fillPackageSelect(),
  ]);
}

async function submitBooking(event) {
  event.preventDefault();

  try {
    setMessage("message", "Saving booking...");
    await ensureSupabaseAuth();

    const date = document.getElementById("date").value;
    const booking_id = await generateBookingId(date);

    const payload = {
      booking_id,
      date,
      month: document.getElementById("bookingMonth").value,
      year: Number(document.getElementById("bookingYear").value || 0),
      customer_type: document.getElementById("customerType").value,
      vehicle_plate: document.getElementById("plate").value.trim(),
      customer_name: document.getElementById("name").value.trim(),
      contact_no: document.getElementById("contactNo").value.trim(),
      email: document.getElementById("email").value.trim(),
      service_address: document.getElementById("address").value.trim(),
      service_id_category: document.getElementById("package").value,
      service_charge_rm: Number(document.getElementById("serviceCharge").value || 0),
      time_slot: document.getElementById("timeSlot").value,
      time: document.getElementById("bookingTime").value,
      assigned_crew: document.getElementById("crew").value,
      booking_source: document.getElementById("source").value,
      booking_status: document.getElementById("status").value,
      remarks: document.getElementById("bookingRemarks").value.trim(),
    };

    const { data, error } = await db.from(TABLES.booking).insert([payload]).select("booking_id, created_at").single();
    if (error) throw error;

    localStorage.setItem("booking_id", data.booking_id);
    document.getElementById("bookingIdInput").value = data.booking_id;
    document.getElementById("bookingId").textContent = data.booking_id;
    document.getElementById("bookingCreatedAt").value = data.created_at || "";
    setMessage("message", `Booking saved: ${data.booking_id}`, "success");

    await loadBookingSelector();
    await refreshDraftBookingId();
  } catch (error) {
    setMessage("message", `Unable to save booking: ${error.message}`, "error");
  }
}

function normalizeBooking(row) {
  return {
    booking_id: row.booking_id,
    customer_name: row.customer_name || "",
  };
}

async function loadBookingSelector() {
  const selector = document.getElementById("jobBookingSelector");
  if (!selector) return;

  const { data, error } = await db
    .from(TABLES.booking)
    .select("booking_id, customer_name")
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) {
    selector.innerHTML = '<option value="">Unable to load booking list</option>';
    setMessage("jobMessage", `Booking list load failed: ${error.message}`, "error");
    return;
  }

  bookingCache = (data || []).map(normalizeBooking).filter((x) => x.booking_id);
  selector.innerHTML = '<option value="">Select booking_id...</option>';
  bookingCache.forEach((item) => {
    const op = document.createElement("option");
    op.value = item.booking_id;
    op.textContent = `${item.booking_id} - ${item.customer_name || "No Name"}`;
    selector.appendChild(op);
  });

  const savedId = localStorage.getItem("booking_id") || "";
  if (savedId) {
    selector.value = savedId;
    document.getElementById("jobBookingId").value = savedId;
  }
}

function onBookingSelected(event) {
  const id = event.target.value;
  if (!id) return;
  document.getElementById("jobBookingId").value = id;
  localStorage.setItem("booking_id", id);
}

async function submitJob(event) {
  event.preventDefault();

  try {
    await ensureSupabaseAuth();

    const payload = {
      booking_id: document.getElementById("jobBookingId").value.trim(),
      mileage_km: Number(document.getElementById("jobMileage").value || 0),
      on_site_condition: document.getElementById("jobOnSiteCondition").value || null,
      job_status: document.getElementById("jobStatus").value || null,
      technician_remarks: document.getElementById("jobTechnicianRemarks").value.trim(),
    };

    const { data, error } = await db.from(TABLES.job).insert([payload]).select("id, booking_id, created_at").single();
    if (error) throw error;

    localStorage.setItem("booking_id", data.booking_id || payload.booking_id);
    document.getElementById("jobRecordId").value = data.id || "";
    document.getElementById("jobCreatedAt").value = data.created_at || "";
    setMessage("jobMessage", "Job sheet saved successfully.", "success");
  } catch (error) {
    setMessage("jobMessage", `Unable to save job sheet: ${error.message}`, "error");
  }
}

async function submitPayment(event) {
  event.preventDefault();

  try {
    await ensureSupabaseAuth();

    const payload = {
      booking_id: document.getElementById("paymentBookingId").value.trim(),
      amount_paid_rm: Number(document.getElementById("paymentAmount").value || 0),
      payment_method: document.getElementById("paymentMethod").value,
      payment_status: document.getElementById("paymentStatus").value || null,
    };

    const { data, error } = await db.from(TABLES.payment).insert([payload]).select("id, booking_id, created_at").single();
    if (error) throw error;

    localStorage.setItem("booking_id", data.booking_id || payload.booking_id);
    document.getElementById("paymentRecordId").value = data.id || "";
    document.getElementById("paymentCreatedAt").value = data.created_at || "";
    setMessage("paymentMessage", "Payment sheet saved successfully.", "success");
  } catch (error) {
    setMessage("paymentMessage", `Unable to save payment sheet: ${error.message}`, "error");
  }
}

function setupPage() {
  fillSavedBookingId();

  const bookingForm = document.getElementById("bookingForm");
  const jobForm = document.getElementById("jobForm");
  const paymentForm = document.getElementById("paymentForm");
  const jobSelector = document.getElementById("jobBookingSelector");
  const bookingDate = document.getElementById("date");

  if (bookingDate) {
    if (!bookingDate.value) bookingDate.value = getToday();
    syncBookingDateParts();
    bookingDate.addEventListener("change", () => {
      syncBookingDateParts();
      refreshDraftBookingId().catch((err) => setMessage("message", err.message, "error"));
    });
  }

  if (bookingForm) bookingForm.addEventListener("submit", submitBooking);
  if (jobForm) jobForm.addEventListener("submit", submitJob);
  if (paymentForm) paymentForm.addEventListener("submit", submitPayment);
  if (jobSelector) jobSelector.addEventListener("change", onBookingSelected);

  ensureSupabaseAuth()
    .then(async () => {
      await loadReferenceData();
      await loadBookingSelector();
      await refreshDraftBookingId();
    })
    .catch((err) => {
      setMessage("message", err.message, "error");
      setMessage("jobMessage", err.message, "error");
      setMessage("paymentMessage", err.message, "error");
    });
}

document.addEventListener("DOMContentLoaded", setupPage);
