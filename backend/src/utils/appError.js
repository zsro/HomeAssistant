function createAppError(status, errorCode, message = null, extra = null) {
  const appError = new Error(message || errorCode.msg);
  appError.status = status;
  appError.errorCode = errorCode;

  if (extra !== null && extra !== undefined) {
    appError.extra = extra;
  }

  return appError;
}

function isAppError(error) {
  return Boolean(error?.status && error?.errorCode);
}

module.exports = {
  createAppError,
  isAppError,
};
