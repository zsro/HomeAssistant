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

function authenticateDisplay(options = {}) {
  const { allowPairToken = false } = options;

  return async function authenticateDisplayMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json(error(ErrorCodes.AUTH_UNAUTHORIZED));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const session = await db.displaySession.findById(decoded.sessionId);

      if (!session) {
        return res.status(403).json(error(ErrorCodes.DISPLAY_SESSION_NOT_FOUND));
      }

      if (decoded.type === 'display_pair') {
        if (!allowPairToken || session.pairToken !== token) {
          return res.status(403).json(error(ErrorCodes.DISPLAY_TOKEN_INVALID));
        }
      } else if (decoded.type === 'display') {
        if (session.displayToken !== token) {
          return res.status(403).json(error(ErrorCodes.DISPLAY_TOKEN_INVALID));
        }
      } else {
        return res.status(403).json(error(ErrorCodes.DISPLAY_TOKEN_INVALID));
      }

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
  generateDisplayToken,
  generatePairToken,
};
