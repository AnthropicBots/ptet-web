const success = (
  res,
  data = null,
  message = "Success",
  statusCode = 200
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const error = (
  res,
  message = "Something went wrong",
  statusCode = 500
) => {
  return res.status(statusCode).json({
    success: false,
    message,
  });
};

const paginate = (
  res,
  data,
  page,
  limit,
  total,
  message = "Success"
) => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      page,
      limit,
      total,
      pages: limit > 0 ? Math.ceil(total / limit) : 0,
    },
  });
};

module.exports = {
  success,
  error,
  paginate,
};