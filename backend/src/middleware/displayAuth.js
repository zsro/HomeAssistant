const jwt = require('jsonwebtoken');
const db = require('../models/dbAdapter');
const { JWT_SECRET } = require('./auth');
const { error, ErrorCodes } = require('../utils/errorCodes');

function generatePairToken(sessionId) {
  return jwt.sign(
    {
      type: 'display_pair',
      sessionId,
    },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
}

function generateDisplayToken({ sessionId, deviceId, familyId }) {
  return jwt.sign(
    {
      type: 'display',
      sessionId,
      deviceId,
      familyId,
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

async function getDisplayAuthFromToken(token, options = {}) {
  const { allowPairToken = false } = options;
  const decoded = jwt.verify(token, JWT_SECRET);
  const session = await db.displaySession.findById(decoded.sessionId);

  if (!session) {
    const authError = new Error('Display session not found');
    authError.code = ErrorCodes.DISPLAY_SESSION_NOT_FOUND.code;
    throw authError;
  }

  if (decoded.type === 'display_pair') {
    if (!allowPairToken || session.pairToken !== token) {
      const authError = new Error('Display pair token invalid');
      authError.code = ErrorCodes.DISPLAY_TOKEN_INVALID.code;
      throw authError;
    }
  } else if (decoded.type === 'display') {
    if (session.displayToken !== token) {
      const authError = new Error('Display token invalid');
      authError.code = ErrorCodes.DISPLAY_TOKEN_INVALID.code;
      throw authError;
    }
  } else {
    const authError = new Error('Unknown display token type');
    authError.code = ErrorCodes.DISPLAY_TOKEN_INVALID.code;
    throw authError;
  }

  return {
    decoded,
    session,
  };
}

function authenticateDisplay(options = {}) {
  const { allowPairToken = false } = options;

  return async function authenticateDisplayMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json(error(ErrorCodes.AUTH_UNAUTHORIZED));
    }

    try {
      const { decoded, session } = await getDisplayAuthFromToken(token, { allowPairToken });

      req.displayToken = token;
      req.displayAuth = decoded;
      req.displaySession = session;
      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(403).json(error(ErrorCodes.AUTH_TOKEN_EXPIRED));
      }

      return res.status(403).json(error(ErrorCodes.DISPLAY_TOKEN_INVALID));
    }
  };
}

module.exports = {
  authenticateDisplay,
  getDisplayAuthFromToken,
  generateDisplayToken,
  generatePairToken,
};
