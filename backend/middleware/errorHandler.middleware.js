// backend/middleware/errorHandler.middleware.js
export function errorHandler(err, req, res, next) {
  console.error("[error]", req.method, req.path, err.message);

  if (res.headersSent) return next(err);

  // Mongo duplicate key
  if (err.code === 11000) {
    return res.status(409).json({ error: "DUPLICATE", details: err.keyValue });
  }
  // Validation
  if (err.name === "ValidationError") {
    return res.status(400).json({ error: "VALIDATION", details: err.errors });
  }

  res.status(err.status || 500).json({
    error: err.code || "INTERNAL",
    message: process.env.NODE_ENV === "production" ? undefined : err.message
  });
}