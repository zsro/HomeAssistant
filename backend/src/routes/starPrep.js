const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const starPrepController = require('../controllers/starPrepController');

const router = express.Router();

router.get('/templates', authenticateToken, starPrepController.getTemplates);
router.get('/templates/:id', authenticateToken, starPrepController.getTemplate);
router.post('/templates', authenticateToken, starPrepController.createTemplate);
router.post('/templates/:id/apply', authenticateToken, starPrepController.applyTemplate);
router.post('/templates/generate-week', authenticateToken, starPrepController.generateWeekTemplate);
router.post('/templates/generate', starPrepController.generateTemplate);
router.post('/templates/optimize', starPrepController.optimizeTemplate);
router.post('/activities/variant', starPrepController.generateActivityVariant);
router.get('/ai-providers', starPrepController.getAIProviders);
router.get('/checkins', authenticateToken, starPrepController.getCheckins);
router.post('/checkins', authenticateToken, starPrepController.createCheckin);
router.get('/checkins/today', authenticateToken, starPrepController.getTodayCheckin);
router.get('/calendar', authenticateToken, starPrepController.getCalendar);
router.get('/today', authenticateToken, starPrepController.getToday);
router.get('/stats', authenticateToken, starPrepController.getStats);

module.exports = router;
