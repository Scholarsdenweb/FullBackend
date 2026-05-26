const axios = require("axios");
const Admin = require("../models/Admin");
const User = require("../models/UserModel");

const toSafeString = (value) => (value == null ? "" : String(value).trim());

const pickDefined = (obj = {}) =>
  Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined && value !== null),
  );

const getCounsellors = async () => {
  return Admin.find({ role: "counsellor" }).select("name email").lean();
};

const pickBestCounsellor = async () => {
  const counsellors = await getCounsellors();
  if (!counsellors.length) return null;

  const emails = counsellors.map((item) => item.email).filter(Boolean);
  if (!emails.length) return counsellors[0];

  const counts = await User.aggregate([
    { $match: { enquiryTakenBy: { $in: emails } } },
    { $group: { _id: "$enquiryTakenBy", count: { $sum: 1 } } },
  ]);

  const countMap = new Map(counts.map((item) => [item._id, item.count]));
  let best = counsellors[0];
  let minCount = countMap.get(best.email) || 0;

  for (const counsellor of counsellors) {
    const current = countMap.get(counsellor.email) || 0;
    if (current < minCount) {
      minCount = current;
      best = counsellor;
    }
  }

  return best;
};

const ensureLeadCounsellor = async (leadDoc, preferredCounsellorEmail) => {
  if (!leadDoc) return null;

  if (leadDoc.enquiryTakenBy) {
    const assigned = await Admin.findOne({
      role: "counsellor",
      email: leadDoc.enquiryTakenBy,
    })
      .select("name email")
      .lean();
    return assigned || { email: leadDoc.enquiryTakenBy, name: "" };
  }

  let selected = null;
  if (preferredCounsellorEmail) {
    selected = await Admin.findOne({
      role: "counsellor",
      email: preferredCounsellorEmail,
    })
      .select("name email")
      .lean();
  }

  if (!selected) {
    selected = await pickBestCounsellor();
  }

  if (selected?.email) {
    leadDoc.enquiryTakenBy = selected.email;
    await leadDoc.save();
  }

  return selected;
};

// const syncLeadToCims = async (payload = {}, source = "unknown") => {
//   const webhookUrl = toSafeString(process.env.CIMS_ENQUIRY_SYNC_URL);
//   const internalApiKey = toSafeString(
//     process.env.CIMS_INTERNAL_API_KEY || process.env.INTERNAL_API_KEY,
//   );
//   const csrfToken = toSafeString(process.env.CIMS_CSRF_TOKEN);
//   const csrfCookie = toSafeString(process.env.CIMS_CSRF_COOKIE);
//   const referer = toSafeString(process.env.CIMS_REFERER);

//   console.log(`[CIMS_LEAD_SYNC][${source}] start`);
//   console.log(
//     `[CIMS_LEAD_SYNC][${source}] config webhookUrl=${webhookUrl ? "set" : "missing"} apiKey=${internalApiKey ? "set" : "missing"}`,
//   );

//   if (!webhookUrl || !internalApiKey) {
//     console.warn(
//       `[CIMS_LEAD_SYNC][${source}] Missing CIMS_ENQUIRY_SYNC_URL or INTERNAL_API_KEY`,
//     );
//     return { ok: false, skipped: true, message: "missing_config" };
//   }

//   const leadId = toSafeString(
//     payload.leadId ||
//       payload.enquiryNumber ||
//       payload.enquiry_number ||
//       payload.enquiryId ||
//       payload._id,
//   );
//   if (!leadId) {
//     console.warn(`[CIMS_LEAD_SYNC][${source}] Missing leadId/enquiryNumber in payload`);
//     return { ok: false, skipped: true, message: "missing_lead_id" };
//   }

//   const requestPayload = {
//     ...pickDefined(payload),
//     leadId,
//     enquiryNumber: leadId,
//     enquiry_number: leadId,
//   };
//   console.log(`[CIMS_LEAD_SYNC][${source}] prepared leadId=${leadId}`);
//   console.log(`[CIMS_LEAD_SYNC][${source}] payload=`, requestPayload);

//   try {
//     const headers = {
//       "x-internal-api-key": internalApiKey,
//       "Content-Type": "application/json",
//     };
//     if (csrfToken) headers["X-CSRFToken"] = csrfToken;
//     if (csrfCookie) headers.Cookie = csrfCookie;
//     if (referer) headers.Referer = referer;

//     const response = await axios.post(webhookUrl, requestPayload, {
//       headers,
//       timeout: 12000,
//     });
//     console.log(`[CIMS_LEAD_SYNC][${source}] success leadId=${leadId} status=${response.status}`);
//     console.log(`[CIMS_LEAD_SYNC][${source}] responseData=`, response?.data);
//     return { ok: true, status: response.status, data: response.data };
//   } catch (error) {
//     const statusCode = error?.response?.status;
//     const message =
//       error?.response?.data?.error ||
//       error?.response?.data?.message ||
//       error?.message ||
//       "unknown_error";
//     console.error(
//       `[CIMS_LEAD_SYNC][${source}] failed leadId=${leadId} status=${statusCode || "NA"} message=${message}`,
//     );
//     console.error(`[CIMS_LEAD_SYNC][${source}] errorResponse=`, error?.response?.data);
//     const raw = String(error?.response?.data || "");
//     if (raw.includes("CSRF verification failed") || raw.includes("CSRF cookie not set")) {
//       console.error(
//         `[CIMS_LEAD_SYNC][${source}] hint=Target CIMS endpoint is CSRF-protected. Use csrf_exempt API endpoint or configure CIMS_CSRF_TOKEN/CIMS_CSRF_COOKIE/CIMS_REFERER env vars.`,
//       );
//     }
//     console.error(`[CIMS_LEAD_SYNC][${source}] stack=`, error?.stack);
//     return { ok: false, status: statusCode, message };
//   }
// };






const syncLeadToCims = async (payload = {}, source = "unknown") => {
  const webhookUrl = toSafeString(process.env.CIMS_ENQUIRY_SYNC_URL);
  const internalApiKey = toSafeString(
    process.env.CIMS_INTERNAL_API_KEY || process.env.INTERNAL_API_KEY
  );

  console.log(`[CIMS_LEAD_SYNC][${source}] start`);

  if (!webhookUrl || !internalApiKey) {
    console.warn(
      `[CIMS_LEAD_SYNC][${source}] Missing CIMS_ENQUIRY_SYNC_URL or INTERNAL_API_KEY`
    );

    return {
      ok: false,
      skipped: true,
      message: "missing_config",
    };
  }

  // Resolve enquiry id properly
  const enquiryId = toSafeString(
    payload.enquiryId ||
      payload.enquiry_id ||
      payload.enquiryNumber ||
      payload.registrationId ||
      payload.registration_id ||
      payload.leadId ||
      payload._id
  );

  if (!enquiryId) {
    console.warn(
      `[CIMS_LEAD_SYNC][${source}] Missing enquiryId/enquiryNumber`
    );

    return {
      ok: false,
      skipped: true,
      message: "missing_enquiry_id",
    };
  }

  // Build clean payload
  const requestPayload = pickDefined({
    enquiryId,
    enquiry_id: enquiryId,
    enquiryNumber: enquiryId,

    student_name:
      payload.student_name || payload.studentName || payload.name,

    student_phone:
      payload.student_phone ||
      payload.studentContactNumber ||
      payload.mobile,

    student_email:
      payload.student_email || payload.email,

    parent_name:
      payload.parent_name ||
      payload.father_name ||
      payload.fatherName,

    parent_phone:
      payload.parent_phone ||
      payload.father_phone ||
      payload.fatherPhone,

    city: payload.city,
    state: payload.state,

    source: payload.source || "online",

    referral_name:
      payload.referral_name ||
      payload.referralName ||
      payload.remarks,

    program:
      payload.program ||
      payload.course_name,

    class_name:
      payload.class_name ||
      payload.classForAdmission ||
      payload.current_class,

    status: payload.status || "new",
  });

  console.log(
    `[CIMS_LEAD_SYNC][${source}] prepared enquiryId=${enquiryId}`
  );

  console.log(
    `[CIMS_LEAD_SYNC][${source}] requestPayload=`,
    requestPayload
  );

  try {
    const response = await axios.post(
      webhookUrl,
      requestPayload,
      {
        headers: {
          "x-internal-api-key": internalApiKey,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    console.log("response from the syncLeadTOCims", response);

    console.log(
      `[CIMS_LEAD_SYNC][${source}] success enquiryId=${enquiryId} status=${response.status}`
    );

    console.log(
      `[CIMS_LEAD_SYNC][${source}] responseData=`,
      response.data
    );

    return {
      ok: true,
      status: response.status,
      data: response.data,
    };
  } catch (error) {
    const statusCode = error?.response?.status;

    const message =
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      "unknown_error";

    console.error(
      `[CIMS_LEAD_SYNC][${source}] failed enquiryId=${enquiryId} status=${statusCode || "NA"} message=${message}`
    );

    console.error(
      `[CIMS_LEAD_SYNC][${source}] errorResponse=`,
      error?.response?.data
    );

    console.error(
      `[CIMS_LEAD_SYNC][${source}] stack=`,
      error?.stack
    );

    return {
      ok: false,
      status: statusCode,
      message,
    };
  }
};





const buildLeadPayloadFromEnquiry = (enquiry = {}, assignedCounsellor = {}) => {
  const leadId = toSafeString(enquiry.enquiryNumber || enquiry._id);

  return {
    leadId,
    enquiryId: toSafeString(enquiry._id),
    student_name: toSafeString(enquiry.studentName),
    student_phone: toSafeString(enquiry.studentContactNumber),
    father_phone: toSafeString(enquiry.fatherContactNumber),
    student_email: toSafeString(enquiry.email),
    current_class: toSafeString(enquiry.courseOfIntrested),
    program: toSafeString(enquiry.program),
    school_name: toSafeString(enquiry.schoolName),
    father_name: toSafeString(enquiry.fatherName),
    father_occupation: toSafeString(enquiry.fatherOccupations),
    city: toSafeString(enquiry.city),
    state: toSafeString(enquiry.state),
    how_to_know: toSafeString(enquiry.howToKnow),
    remarks: toSafeString(enquiry.remarks),
    counsellor_email: toSafeString(assignedCounsellor?.email || enquiry.enquiryTakenBy),
    counsellor_name: toSafeString(assignedCounsellor?.name),
  };
};

const syncEnquiryToCims = async (enquiry, source = "enquiry_submit", assignedCounsellor = null) => {
  if (!enquiry) {
    return { ok: false, skipped: true, message: "missing_enquiry" };
  }

  const counsellor = assignedCounsellor || (await ensureLeadCounsellor(enquiry));
  return syncLeadToCims(buildLeadPayloadFromEnquiry(enquiry, counsellor), source);
};

module.exports = {
  buildLeadPayloadFromEnquiry,
  ensureLeadCounsellor,
  syncEnquiryToCims,
  syncLeadToCims,
};
