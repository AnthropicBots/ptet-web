const jwtEmailSecret = process.env.JWT_EMAIL_SECRET;

if (!jwtEmailSecret) {
  throw new Error(
    "JWT_EMAIL_SECRET environment variable must be defined"
  );
}

module.exports = {
  jwtEmailSecret,
};