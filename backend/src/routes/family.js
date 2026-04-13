const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const familyController = require('../controllers/familyController');

const router = express.Router();

router.get('/', authenticateToken, familyController.getFamily);
router.get('/members', authenticateToken, familyController.getMembers);
router.put('/', authenticateToken, familyController.updateFamily);
router.post('/join', authenticateToken, familyController.joinFamily);
router.post('/leave', authenticateToken, familyController.leaveFamily);
router.post('/create', authenticateToken, familyController.createFamily);

module.exports = router;
