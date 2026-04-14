const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { authenticateDisplay } = require('../middleware/displayAuth');
const displayController = require('../controllers/displayController');

const router = express.Router();

router.post('/session', displayController.createSession);
router.get('/session', authenticateDisplay({ allowPairToken: true }), displayController.getSession);
router.post('/session/refresh', authenticateDisplay({ allowPairToken: true }), displayController.refreshSession);
router.post('/session/heartbeat', authenticateDisplay(), displayController.heartbeat);
router.get('/state', authenticateDisplay(), displayController.getDisplayState);

router.post('/pair', authenticateToken, displayController.pairDisplay);
router.get('/devices', authenticateToken, displayController.getDevices);
router.get('/devices/:deviceId/state', authenticateToken, displayController.getDeviceState);
router.put('/devices/:deviceId/state', authenticateToken, displayController.updateDeviceState);

module.exports = router;
