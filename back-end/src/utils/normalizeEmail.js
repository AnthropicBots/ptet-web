function normalizeEmail(email) {
  return email?.trim().toLowerCase() || "";
}

module.exports = normalizeEmail;