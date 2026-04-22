const axios = require("axios");

const toSafeString = (value) => (value == null ? "" : String(value).trim());

const syncRegistrationToCims = async (payload = {}, source = "unknown") => {
  const webhookUrl = toSafeString(process.env.CIMS_REGISTRATION_SYNC_URL);
  const internalApiKey = toSafeString(process.env.INTERNAL_API_KEY);

  if (!webhookUrl || !internalApiKey) {
    console.warn(`[CIMS_SYNC][${source}] Missing CIMS_REGISTRATION_SYNC_URL or INTERNAL_API_KEY`);
    return { ok: false, skipped: true, message: "missing_config" };
  }

  const registrationId = toSafeString(payload.registrationId || payload.registration_id);
  if (!registrationId) {
    console.warn(`[CIMS_SYNC][${source}] Missing registrationId in payload`);
    return { ok: false, skipped: true, message: "missing_registration_id" };
  }

  const requestPayload = {
    ...payload,
    registrationId,
  };

  try {
    const response = await axios.post(webhookUrl, requestPayload, {
      headers: { "x-internal-api-key": internalApiKey },
      timeout: 12000,
    });
    console.log(
      `[CIMS_SYNC][${source}] success registrationId=${registrationId} status=${response.status}`
    );
    return { ok: true, status: response.status, data: response.data };
  } catch (error) {
    const statusCode = error?.response?.status;
    const message =
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      "unknown_error";
    console.error(
      `[CIMS_SYNC][${source}] failed registrationId=${registrationId} status=${statusCode || "NA"} message=${message}`
    );
    return { ok: false, status: statusCode, message };
  }
};

module.exports = { syncRegistrationToCims };
