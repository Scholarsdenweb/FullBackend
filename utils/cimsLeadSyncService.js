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

const syncLeadToCims = async (payload = {}, source = "unknown") => {
  const webhookUrl = toSafeString(process.env.CIMS_ENQUIRY_SYNC_URL);
  const internalApiKey = toSafeString(
    process.env.CIMS_INTERNAL_API_KEY || process.env.INTERNAL_API_KEY,
  );
  const csrfToken = toSafeString(process.env.CIMS_CSRF_TOKEN);
  const csrfCookie = toSafeString(process.env.CIMS_CSRF_COOKIE);
  const referer = toSafeString(process.env.CIMS_REFERER);

  console.log(`[CIMS_LEAD_SYNC][${source}] start`);
  console.log(
    `[CIMS_LEAD_SYNC][${source}] config webhookUrl=${webhookUrl ? "set" : "missing"} apiKey=${internalApiKey ? "set" : "missing"}`,
  );

  if (!webhookUrl || !internalApiKey) {
    console.warn(
      `[CIMS_LEAD_SYNC][${source}] Missing CIMS_ENQUIRY_SYNC_URL or INTERNAL_API_KEY`,
    );
    return { ok: false, skipped: true, message: "missing_config" };
  }

  const leadId = toSafeString(
    payload.leadId ||
      payload.enquiryNumber ||
      payload.enquiry_number ||
      payload.enquiryId ||
      payload._id,
  );
  if (!leadId) {
    console.warn(`[CIMS_LEAD_SYNC][${source}] Missing leadId/enquiryNumber in payload`);
    return { ok: false, skipped: true, message: "missing_lead_id" };
  }

  const requestPayload = {
    ...pickDefined(payload),
    leadId,
    enquiryNumber: leadId,
    enquiry_number: leadId,
  };
  console.log(`[CIMS_LEAD_SYNC][${source}] prepared leadId=${leadId}`);
  console.log(`[CIMS_LEAD_SYNC][${source}] payload=`, requestPayload);

  try {
    const headers = {
      "x-internal-api-key": internalApiKey,
      "Content-Type": "application/json",
    };
    if (csrfToken) headers["X-CSRFToken"] = csrfToken;
    if (csrfCookie) headers.Cookie = csrfCookie;
    if (referer) headers.Referer = referer;

    const response = await axios.post(webhookUrl, requestPayload, {
      headers,
      timeout: 12000,
    });
    console.log(`[CIMS_LEAD_SYNC][${source}] success leadId=${leadId} status=${response.status}`);
    console.log(`[CIMS_LEAD_SYNC][${source}] responseData=`, response?.data);
    return { ok: true, status: response.status, data: response.data };
  } catch (error) {
    const statusCode = error?.response?.status;
    const message =
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      "unknown_error";
    console.error(
      `[CIMS_LEAD_SYNC][${source}] failed leadId=${leadId} status=${statusCode || "NA"} message=${message}`,
    );
    console.error(`[CIMS_LEAD_SYNC][${source}] errorResponse=`, error?.response?.data);
    const raw = String(error?.response?.data || "");
    if (raw.includes("CSRF verification failed") || raw.includes("CSRF cookie not set")) {
      console.error(
        `[CIMS_LEAD_SYNC][${source}] hint=Target CIMS endpoint is CSRF-protected. Use csrf_exempt API endpoint or configure CIMS_CSRF_TOKEN/CIMS_CSRF_COOKIE/CIMS_REFERER env vars.`,
      );
    }
    console.error(`[CIMS_LEAD_SYNC][${source}] stack=`, error?.stack);
    return { ok: false, status: statusCode, message };
  }
};

module.exports = {
  ensureLeadCounsellor,
  syncLeadToCims,
};
