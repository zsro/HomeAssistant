const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const pinyinController = require('../controllers/pinyinController');

const router = express.Router();

router.get('/overview', authenticateToken, pinyinController.getOverview);
router.get('/summary', authenticateToken, pinyinController.getSummary);
router.post('/progress/complete', authenticateToken, pinyinController.completeLesson);

module.exports = router;
