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
  technicianCrew: "ref_technician_crew",
  jobStatus: "ref_job_status",
  paymentStatus: "ref_payment_status",
};

let authReady = false;
let bookingCache = [];

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

function getPrefixFromDate(dateValue) {
  const fallback = getTodayString();
  const source = dateValue || fallback;
  const [y, m, d] = source.split("-");
  if (!y || !m || !d) return `CIJ${fallback.replaceAll("-", "")}`;
  return `CIJ${y}${m}${d}`;
}

function setMessage(targetId, text, type = "") {
  const el = document.getElementById(targetId);
  if (!el) return;
  el.textContent = text;
  el.className = `result ${type}`.trim();
}

async function ensureSupabaseAuth() {
  if (authReady) return;
  const {
    data: { session },
    error: sessionError,
  } = await db.auth.getSession();

  if (sessionError) throw new Error(`Unable to initialize Supabase session: ${sessionError.message}`);

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

function fillBookingIdFields() {
  const id = localStorage.getItem("booking_id") || "";
  const output = document.getElementById("bookingId");
  const bookingInput = document.getElementById("bookingIdInput");
  const jobBookingId = document.getElementById("jobBookingId");
  const paymentBookingId = document.getElementById("paymentBookingId");

  if (output && id) output.textContent = id;
  if (bookingInput && id) bookingInput.value = id;
  if (jobBookingId && id) jobBookingId.value = id;
  if (paymentBookingId && id) paymentBookingId.value = id;
}

function syncBookingDateParts() {
  const dateInput = document.getElementById("date");
  const monthInput = document.getElementById("bookingMonth");
  const yearInput = document.getElementById("bookingYear");
  if (!dateInput || !monthInput || !yearInput || !dateInput.value) return;

  const dateObj = new Date(dateInput.value);
  monthInput.value = String(dateObj.getMonth() + 1).padStart(2, "0");
  yearInput.value = String(dateObj.getFullYear());
}

async function generateBookingId(dateValue) {
  const prefix = getPrefixFromDate(dateValue);

  try {
    const { data, error } = await db
      .from(TABLES.booking)
      .select("booking_id")
      .like("booking_id", `${prefix}-%`)
      .limit(1000);

    if (!error) {
      let maxSeq = 0;
      (data || []).forEach((row) => {
        const rawId = row.booking_id;
        if (!rawId || !rawId.startsWith(`${prefix}-`)) return;
        const seq = Number(rawId.split("-")[1]);
        if (Number.isFinite(seq) && seq > maxSeq) maxSeq = seq;
      });
      return `${prefix}-${String(maxSeq + 1).padStart(3, "0")}`;
    }
  } catch (_) {
    // fallback below
  }

  // Fallback when SELECT is blocked by RLS: local optimistic sequence
  const key = `booking_seq_${prefix}`;
  const next = Number(localStorage.getItem(key) || "0") + 1;
  localStorage.setItem(key, String(next));
  return `${prefix}-${String(next).padStart(3, "0")}`;
}

async function refreshDraftBookingId() {
  const bookingInput = document.getElementById("bookingIdInput");
  const bookingDate = document.getElementById("date");
  if (!bookingInput || !bookingDate) return;

  await ensureSupabaseAuth();
  bookingInput.value = await generateBookingId(bookingDate.value);
}

function pickRefValue(row) {
  return row?.value || row?.name || row?.label || Object.values(row || {})[0] || "";
}

async function populateSelectFromRef(selectId, tableName) {
  const select = document.getElementById(selectId);
  if (!select) return;

  const { data, error } = await db.from(tableName).select("*").limit(200);
  if (error || !data?.length) return;

  const values = [...new Set(data.map(pickRefValue).map(String).map((v) => v.trim()).filter(Boolean))];
  if (!values.length) return;

  const current = select.value;
  select.innerHTML = "";
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
  if (current && values.includes(current)) select.value = current;
}

function extractPackageRow(row) {
  return {
    code: row?.code || row?.service_id_category || row?.name || "",
    charge: row?.charge_rm ?? row?.service_charge_rm ?? row?.amount_rm ?? row?.price_rm ?? "",
  };
}

function syncServiceChargeFromPackage() {
  const packageSelect = document.getElementById("package");
  const chargeInput = document.getElementById("serviceCharge");
  if (!packageSelect || !chargeInput) return;

  const selected = packageSelect.options[packageSelect.selectedIndex];
  if (selected && selected.dataset.charge) chargeInput.value = selected.dataset.charge;
}

async function loadPackageOptions() {
  const packageSelect = document.getElementById("package");
  if (!packageSelect) return;

  const { data, error } = await db.from(TABLES.package).select("*").limit(200);
  if (error || !data?.length) return;

  const rows = data.map(extractPackageRow).filter((x) => x.code);
  if (!rows.length) return;

  const current = packageSelect.value;
  packageSelect.innerHTML = "";
  rows.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.code;
    option.textContent = item.charge !== "" ? `${item.code} - RM${item.charge}` : item.code;
    option.dataset.charge = item.charge;
    packageSelect.appendChild(option);
  });

  if (current && rows.some((r) => r.code === current)) packageSelect.value = current;
  syncServiceChargeFromPackage();
  packageSelect.addEventListener("change", syncServiceChargeFromPackage);
}

async function loadReferenceData() {
  await Promise.all([
    populateSelectFromRef("customerType", REF_TABLES.customerType),
    populateSelectFromRef("timeSlot", REF_TABLES.timeSlot),
    populateSelectFromRef("source", REF_TABLES.bookingSource),
    populateSelectFromRef("status", REF_TABLES.bookingStatus),
    populateSelectFromRef("crew", REF_TABLES.technicianCrew),
    populateSelectFromRef("jobOnSiteCondition", REF_TABLES.condition),
    populateSelectFromRef("jobStatus", REF_TABLES.jobStatus),
    populateSelectFromRef("paymentStatus", REF_TABLES.paymentStatus),
    loadPackageOptions(),
  ]);
}

async function submitBooking(event) {
  event.preventDefault();

  try {
    setMessage("message", "Submitting booking...");
    await ensureSupabaseAuth();

    const bookingDate = document.getElementById("date").value;
    const bookingId = await generateBookingId(bookingDate);

    const payload = {
      booking_id: bookingId,
      date: bookingDate,
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

    let { error } = await db.from(TABLES.booking).insert([payload]);
    if (error && /duplicate key|already exists/i.test(error.message || "")) {
      payload.booking_id = `${getPrefixFromDate(bookingDate)}-${String(Math.floor(Math.random() * 900) + 100)}`;
      ({ error } = await db.from(TABLES.booking).insert([payload]));
    }
    if (error) throw error;

    const savedBookingId = payload.booking_id;
    document.getElementById("bookingId").textContent = savedBookingId;
    const bookingInput = document.getElementById("bookingIdInput");
    if (bookingInput) bookingInput.value = savedBookingId;

    localStorage.setItem("booking_id", savedBookingId);
    setMessage("message", `Booking submitted. Your booking ID is ${savedBookingId}.`, "success");

    event.target.reset();
    document.getElementById("date").value = getTodayString();
    syncBookingDateParts();
    await loadBookingOptions();
    await refreshDraftBookingId();
  } catch (error) {
    setMessage("message", error.message, "error");
  }
}

function normalizeBookingRow(row) {
  return {
    bookingId: row.booking_id || "",
    customerName: row.customer_name || "",
    vehiclePlate: row.vehicle_plate || "",
    serviceIdCategory: row.service_id_category || "",
    date: row.date || "",
  };
}

function fillJobFormFromBooking(booking) {
  if (!booking) return;

  const setValue = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value || "";
  };

  setValue("jobBookingId", booking.bookingId);
  localStorage.setItem("booking_id", booking.bookingId || "");
}

async function loadBookingOptions() {
  const selector = document.getElementById("jobBookingSelector");
  if (!selector) return;

  const { data, error } = await db
    .from(TABLES.booking)
    .select("booking_id, customer_name, vehicle_plate, service_id_category, date")
    .order("date", { ascending: false })
    .limit(200);

  if (error) {
    selector.innerHTML = '<option value="">Select unavailable (check policy)</option>';
    setMessage("jobMessage", `Booking list unavailable: ${error.message}`, "error");
    return;
  }

  bookingCache = (data || []).map(normalizeBookingRow).filter((x) => x.bookingId);
  selector.innerHTML = '<option value="">Select booking ID...</option>';

  bookingCache.forEach((booking) => {
    const option = document.createElement("option");
    option.value = booking.bookingId;
    option.textContent = `${booking.bookingId} - ${booking.customerName || "No Name"}`;
    selector.appendChild(option);
  });

  const localId = localStorage.getItem("booking_id") || "";
  if (localId) {
    selector.value = localId;
    const selected = bookingCache.find((item) => item.bookingId === localId);
    if (selected) fillJobFormFromBooking(selected);
  }
}

function onJobBookingSelected(event) {
  const selected = bookingCache.find((item) => item.bookingId === event.target.value);
  if (!selected) return;
  fillJobFormFromBooking(selected);
  setMessage("jobMessage", `Loaded booking ${selected.bookingId}.`, "success");
}

async function submitJob(event) {
  event.preventDefault();
  const bookingId = document.getElementById("jobBookingId").value.trim();

  try {
    await ensureSupabaseAuth();

    const payload = {
      booking_id: bookingId,
      mileage_km: Number(document.getElementById("jobMileage").value || 0),
      on_site_condition: document.getElementById("jobOnSiteCondition").value,
      job_status: document.getElementById("jobStatus").value,
      technician_remarks: document.getElementById("jobTechnicianRemarks").value.trim(),
    };

    const { error } = await db.from(TABLES.job).insert([payload]);
    if (error) throw error;

    localStorage.setItem("booking_id", bookingId);
    setMessage("jobMessage", "Job sheet saved successfully.", "success");
    event.target.reset();
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
      amount_paid_rm: Number(document.getElementById("paymentAmount").value || 0),
      payment_method: document.getElementById("paymentMethod").value,
      payment_status: document.getElementById("paymentStatus").value,
    };

    const { error } = await db.from(TABLES.payment).insert([payload]);
    if (error) throw error;

    localStorage.setItem("booking_id", bookingId);
    setMessage("paymentMessage", "Payment sheet saved successfully.", "success");
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

  ["date"].forEach((id) => {
    const dateInput = document.getElementById(id);
    if (dateInput && !dateInput.value) dateInput.value = getTodayString();
  });

  const bookingDate = document.getElementById("date");
  if (bookingDate) {
    bookingDate.addEventListener("change", () => {
      syncBookingDateParts();
      refreshDraftBookingId().catch((err) => setMessage("message", err.message, "error"));
    });
  }
  if (jobBookingSelector) jobBookingSelector.addEventListener("change", onJobBookingSelected);

  syncBookingDateParts();

  ensureSupabaseAuth()
    .then(async () => {
      await loadReferenceData();
      await loadBookingOptions();
      await refreshDraftBookingId();
    })
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
