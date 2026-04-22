const INTERNAL_API_KEY = (process.env.INTERNAL_API_KEY || "").trim();

const internalApiKeyMiddleware = (req, res, next) => {
  const incomingKey = (req.headers["x-internal-api-key"] || "").trim();
  if (!INTERNAL_API_KEY || !incomingKey || incomingKey !== INTERNAL_API_KEY) {
    return res.status(401).json({ error: "Unauthorized internal API request" });
  }
  return next();
};

module.exports = internalApiKeyMiddleware;
