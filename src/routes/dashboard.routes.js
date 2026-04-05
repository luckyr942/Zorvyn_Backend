const express = require('express');
const router = express.Router();
const DashboardService = require('../services/dashboard.service');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// All dashboard routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/dashboard/summary:
 *   get:
 *     summary: Get financial summary (total income, expenses, net balance)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Financial summary
 *       403:
 *         description: Forbidden - Analyst or Admin only
 */
router.get('/summary', authorize('analyst', 'admin'), (req, res, next) => {
  try {
    const summary = DashboardService.getSummary();
    res.json({
      success: true,
      data: { summary },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/dashboard/category-totals:
 *   get:
 *     summary: Get category-wise breakdown
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Category totals
 */
router.get(
  '/category-totals',
  authorize('analyst', 'admin'),
  (req, res, next) => {
    try {
      const categoryTotals = DashboardService.getCategoryTotals();
      res.json({
        success: true,
        data: { categoryTotals },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/dashboard/trends:
 *   get:
 *     summary: Get monthly/weekly trends
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [monthly, weekly]
 *           default: monthly
 *     responses:
 *       200:
 *         description: Trend data
 */
router.get('/trends', authorize('analyst', 'admin'), (req, res, next) => {
  try {
    const { period } = req.query;
    const trends = DashboardService.getTrends({ period });
    res.json({
      success: true,
      data: { trends },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/dashboard/recent:
 *   get:
 *     summary: Get recent activity
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Recent records
 */
router.get(
  '/recent',
  authorize('viewer', 'analyst', 'admin'),
  (req, res, next) => {
    try {
      const { limit } = req.query;
      const records = DashboardService.getRecentActivity({
        limit: limit ? parseInt(limit) : 10,
      });
      res.json({
        success: true,
        data: { records },
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
