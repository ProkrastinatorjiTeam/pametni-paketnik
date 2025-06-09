// routes/statsRoutes.js

const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const { requireAdmin } = require('../middleware/auth');

router.get('/overview', requireAdmin, statsController.getOverviewStats);
router.get('/top-products', requireAdmin, statsController.getTopProducts);
router.get('/recent-orders', requireAdmin, statsController.getRecentOrders);

module.exports = router;