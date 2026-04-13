const { error, success, ErrorCodes } = require('../utils/errorCodes');
const { isAppError } = require('../utils/appError');

function sendSuccess(res, result = {}) {
  const {
    data = null,
    message = null,
    status = 200,
  } = result;

  return res.status(status).json(success(data, message));
}

function sendError(res, err, fallbackCode = ErrorCodes.SYSTEM_ERROR, fallbackMessage = '请求失败') {
  if (isAppError(err)) {
    return res.status(err.status).json(error(err.errorCode, err.message, err.extra));
  }

  console.error(`${fallbackMessage}:`, err);
  return res.status(500).json(error(fallbackCode, fallbackMessage));
}

module.exports = {
  sendError,
  sendSuccess,
};
