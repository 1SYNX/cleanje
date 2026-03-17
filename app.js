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
  if (!y || !m || !d) {
    const [fy, fm, fd] = fallback.split("-");
    return `CIJ${fy}${fm}${fd}`;
  }
  return `CIJ${y}${m}${d}`;
}

function setMessage(targetId, text, type = "") {
  const el = document.getElementById(targetId);
  if (!el) return;
  el.textContent = text;
  el.className = `result ${type}`.trim();
}



function extractPreferredValue(row, preferredKeys = []) {
  for (const key of preferredKeys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value).trim();
  }

  const keys = Object.keys(row || {});
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

async function populateSelectFromReference(selectId, tableName, preferredKeys = []) {
  const selectEl = document.getElementById(selectId);
  if (!selectEl) return;

  const { data, error } = await db.from(tableName).select("*").limit(200);
  if (error) return;

  const values = (data || [])
    .map((row) => extractPreferredValue(row, preferredKeys))
    .filter(Boolean);

  if (!values.length) return;

  const unique = [...new Set(values)];
  const currentValue = selectEl.value;
  selectEl.innerHTML = "";

  unique.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    selectEl.appendChild(option);
  });

  if (currentValue && unique.includes(currentValue)) {
    selectEl.value = currentValue;
  }
}

async function loadReferenceData() {
  await ensureSupabaseAuth();

  await Promise.all([
    populateSelectFromReference("customerType", REF_TABLES.customerType, ["Customer Type", "customer_type", "type", "name"]),
    populateSelectFromReference("timeSlot", REF_TABLES.timeSlot, ["Time Slot", "time_slot", "slot", "name"]),
    populateSelectFromReference("source", REF_TABLES.bookingSource, ["Booking Source", "booking_source", "source", "name"]),
    populateSelectFromReference("status", REF_TABLES.bookingStatus, ["Booking Status", "booking_status", "status", "name"]),
    populateSelectFromReference("crew", REF_TABLES.technicianCrew, ["Assigned Crew", "technician_crew", "crew", "name"]),
    populateSelectFromReference("jobStatus", REF_TABLES.jobStatus, ["Job Status", "job_status", "status", "name"]),
    populateSelectFromReference("paymentStatus", REF_TABLES.paymentStatus, ["Payment Status", "payment_status", "status", "name"]),
    loadPackageOptions(),
  ]);
}

async function loadPackageOptions() {
  const packageSelect = document.getElementById("package");
  if (!packageSelect) return;

  const { data, error } = await db.from(TABLES.package).select("*").limit(200);
  if (error) return;

  const rows = data || [];
  if (!rows.length) return;

  const extractCategory = (row) =>
    extractPreferredValue(row, ["Service ID Category", "service_id_category", "service_code", "package_code", "code", "name"]);

  const extractCharge = (row) => {
    const key = Object.keys(row || {}).find((k) => /(charge|price|rm|amount)/i.test(k));
    if (!key) return "";
    const value = row[key];
    return value === undefined || value === null ? "" : String(value);
  };

  const options = rows
    .map((row) => ({ category: extractCategory(row), charge: extractCharge(row) }))
    .filter((item) => item.category);

  if (!options.length) return;

  const current = packageSelect.value;
  packageSelect.innerHTML = "";
  options.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.category;
    option.textContent = item.charge ? `${item.category} - RM${item.charge}` : item.category;
    option.dataset.charge = item.charge;
    packageSelect.appendChild(option);
  });

  if (current && options.some((item) => item.category === current)) packageSelect.value = current;
  syncServiceChargeFromPackage();

  packageSelect.addEventListener("change", syncServiceChargeFromPackage);
}

function syncServiceChargeFromPackage() {
  const packageSelect = document.getElementById("package");
  const chargeInput = document.getElementById("serviceCharge");
  if (!packageSelect || !chargeInput) return;

  const selected = packageSelect.options[packageSelect.selectedIndex];
  if (!selected) return;

  const charge = selected.dataset.charge;
  if (charge !== undefined && charge !== "") chargeInput.value = charge;
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

async function generateBookingId(dateValue) {
  const prefix = getPrefixFromDate(dateValue);

  const { data, error } = await db.from(TABLES.booking).select("*").limit(1000);
  if (error) throw new Error(`Unable to generate booking ID: ${error.message}`);

  const rows = data || [];
  let maxSeq = 0;

  rows.forEach((row) => {
    const rawId = row["Booking ID"] || row.booking_id || row.BookingID || "";
    if (typeof rawId !== "string" || !rawId.startsWith(`${prefix}-`)) return;

    const seq = Number(rawId.split("-")[1]);
    if (Number.isFinite(seq) && seq > maxSeq) maxSeq = seq;
  });

  return `${prefix}-${String(maxSeq + 1).padStart(3, "0")}`;
}

async function refreshDraftBookingId() {
  const bookingInput = document.getElementById("bookingIdInput");
  const bookingDate = document.getElementById("date");
  if (!bookingInput || !bookingDate) return;

  await ensureSupabaseAuth();
  const generatedId = await generateBookingId(bookingDate.value);
  bookingInput.value = generatedId;
}

async function submitBooking(event) {
  event.preventDefault();

  try {
    setMessage("message", "Submitting booking...");
    await ensureSupabaseAuth();

    const bookingDate = document.getElementById("date").value;
    const bookingId = await generateBookingId(bookingDate);

    const formValues = {
      setmoreId: document.getElementById("setmoreId").value.trim(),
      date: bookingDate,
      month: document.getElementById("bookingMonth").value,
      year: document.getElementById("bookingYear").value,
      customerType: document.getElementById("customerType").value,
      vehiclePlat: document.getElementById("plate").value.trim(),
      customerName: document.getElementById("name").value.trim(),
      contactNo: document.getElementById("contactNo").value.trim(),
      email: document.getElementById("email").value.trim(),
      serviceAddress: document.getElementById("address").value.trim(),
      serviceIdCategory: document.getElementById("package").value,
      serviceCharge: Number(document.getElementById("serviceCharge").value || 0),
      timeSlot: document.getElementById("timeSlot").value,
      time: document.getElementById("bookingTime").value,
      assignedCrew: document.getElementById("crew").value,
      bookingSource: document.getElementById("source").value,
      bookingStatus: document.getElementById("status").value,
      remarks: document.getElementById("bookingRemarks").value.trim(),
    };

    const payloadSpaced = {
      "Booking ID": bookingId,
      "Setmore ID": formValues.setmoreId,
      Date: formValues.date,
      Month: formValues.month,
      Year: formValues.year,
      "Customer Type": formValues.customerType,
      "Vehicle Plat": formValues.vehiclePlat,
      "Customer Name": formValues.customerName,
      "Contact No": formValues.contactNo,
      Email: formValues.email,
      "Service Address": formValues.serviceAddress,
      "Service ID Category": formValues.serviceIdCategory,
      "Service Charge (RM)": formValues.serviceCharge,
      "Time Slot": formValues.timeSlot,
      Time: formValues.time,
      "Assigned Crew": formValues.assignedCrew,
      "Booking Source": formValues.bookingSource,
      "Booking Status": formValues.bookingStatus,
      Remarks: formValues.remarks,
    };

    const payloadSnake = {
      booking_id: bookingId,
      setmore_id: formValues.setmoreId,
      date: formValues.date,
      month: formValues.month,
      year: formValues.year,
      customer_type: formValues.customerType,
      vehicle_plate: formValues.vehiclePlat,
      customer_name: formValues.customerName,
      contact_no: formValues.contactNo,
      email: formValues.email,
      service_address: formValues.serviceAddress,
      service_id_category: formValues.serviceIdCategory,
      service_charge_rm: formValues.serviceCharge,
      time_slot: formValues.timeSlot,
      time: formValues.time,
      assigned_crew: formValues.assignedCrew,
      booking_source: formValues.bookingSource,
      booking_status: formValues.bookingStatus,
      remarks: formValues.remarks,
    };

    let insertError = null;

    const spacedInsert = await db.from(TABLES.booking).insert([payloadSpaced]);
    if (!spacedInsert.error) {
      insertError = null;
    } else {
      const snakeInsert = await db.from(TABLES.booking).insert([payloadSnake]);
      insertError = snakeInsert.error || null;
      if (insertError) {
        throw new Error(`Unable to save booking with both schema modes. ${insertError.message}`);
      }
    }

    document.getElementById("bookingId").textContent = bookingId;
    const bookingInput = document.getElementById("bookingIdInput");
    if (bookingInput) bookingInput.value = bookingId;
    localStorage.setItem("booking_id", bookingId);

    setMessage("message", `Booking submitted. Your booking ID is ${bookingId}.`, "success");
    event.target.reset();
    document.getElementById("date").value = getTodayString();
    syncBookingDateParts();
    await loadBookingOptions();
    await refreshDraftBookingId();
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
  durationInput.value = ((endMinutes - startMinutes) / 60).toFixed(2);
}


function normalizeBookingRow(row) {
  if (!row) return null;
  return {
    bookingId: row["Booking ID"] || row.booking_id || "",
    customerName: row["Customer Name"] || row.customer_name || "",
    vehiclePlat: row["Vehicle Plat"] || row.vehicle_plate || "",
    serviceIdCategory: row["Service ID Category"] || row.service_id_category || "",
    date: row.Date || row.date || "",
  };
}

function fillJobFormFromBooking(booking) {
  if (!booking) return;

  const setValue = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value || "";
  };

  setValue("jobBookingId", booking.bookingId);
  setValue("jobCustomerName", booking.customerName);
  setValue("jobVehiclePlat", booking.vehiclePlat);
  setValue("jobDate", booking.date || getTodayString());

  const serviceCategory = booking.serviceIdCategory;
  const serviceSelect = document.getElementById("jobServiceCategory");
  if (serviceSelect && serviceCategory) {
    const exists = Array.from(serviceSelect.options).some((opt) => opt.value === serviceCategory);
    if (exists) serviceSelect.value = serviceCategory;
  }

  localStorage.setItem("booking_id", booking.bookingId || "");
  syncJobDateParts();
}

async function loadBookingOptions() {
  const selector = document.getElementById("jobBookingSelector");
  if (!selector) return;

  await ensureSupabaseAuth();

  selector.innerHTML = '<option value="">Loading bookings...</option>';

  let rows = [];
  let queryError = null;

  const spacedQuery = await db
    .from(TABLES.booking)
    .select('"Booking ID", "Customer Name", "Vehicle Plat", "Service ID Category", "Date"')
    .order("Date", { ascending: false })
    .limit(200);

  if (!spacedQuery.error) {
    rows = spacedQuery.data || [];
  } else {
    queryError = spacedQuery.error;
    const snakeQuery = await db
      .from(TABLES.booking)
      .select("booking_id, customer_name, vehicle_plate, service_id_category, date")
      .order("date", { ascending: false })
      .limit(200);

    if (!snakeQuery.error) {
      rows = snakeQuery.data || [];
      queryError = null;
    } else {
      queryError = snakeQuery.error;
    }
  }

  if (queryError) {
    selector.innerHTML = '<option value="">Unable to load bookings</option>';
    setMessage(
      "jobMessage",
      `Unable to load bookings list. Check SELECT policy on ${TABLES.booking}. ${queryError.message}`,
      "error",
    );
    return;
  }

  bookingCache = rows.map(normalizeBookingRow).filter((item) => item && item.bookingId);

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

  if (!bookingCache.length) {
    setMessage("jobMessage", "No bookings found to select yet.");
  } else {
    setMessage("jobMessage", `Loaded ${bookingCache.length} booking(s).`, "success");
  }
}

function onJobBookingSelected(event) {
  const selectedId = event.target.value;
  if (!selectedId) return;

  const selected = bookingCache.find((item) => item.bookingId === selectedId);
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

    const amount = Number(document.getElementById("paymentAmount").value);
    const method = document.getElementById("paymentMethod").value;
    const paymentStatus = document.getElementById("paymentStatus").value;
    const paymentDate = document.getElementById("paymentDate").value;
    const remarks = document.getElementById("paymentRemarks").value.trim();

    const payloadSnake = {
      booking_id: bookingId,
      amount,
      method,
      payment_status: paymentStatus,
      payment_date: paymentDate,
      remarks,
    };

    const payloadSpaced = {
      "Booking ID": bookingId,
      Amount: amount,
      Method: method,
      "Payment Status": paymentStatus,
      "Payment Date": paymentDate,
      Remarks: remarks,
    };

    const snakeInsert = await db.from(TABLES.payment).insert([payloadSnake]);
    if (snakeInsert.error) {
      const spacedInsert = await db.from(TABLES.payment).insert([payloadSpaced]);
      if (spacedInsert.error) {
        throw new Error(`Unable to save payment with both schema modes. ${spacedInsert.error.message}`);
      }
    }

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

  const bookingDate = document.getElementById("date");
  if (bookingDate) {
    bookingDate.addEventListener("change", () => {
      syncBookingDateParts();
      refreshDraftBookingId().catch((err) => setMessage("message", err.message, "error"));
    });
  }
  syncBookingDateParts();

  const jobDateInput = document.getElementById("jobDate");
  const jobStartInput = document.getElementById("jobStartTime");
  const jobEndInput = document.getElementById("jobEndTime");
  if (jobDateInput) jobDateInput.addEventListener("change", syncJobDateParts);
  if (jobStartInput) jobStartInput.addEventListener("change", syncJobDuration);
  if (jobEndInput) jobEndInput.addEventListener("change", syncJobDuration);
  if (jobBookingSelector) jobBookingSelector.addEventListener("change", onJobBookingSelected);
  syncJobDateParts();

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
