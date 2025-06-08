var express = require('express');
var router = express.Router();
var orderController = require('../controllers/orderController.js');
const {requireAdmin, requireAuth} = require('../middleware/auth');

/*
 * GET
 */
router.get('/list', requireAdmin, orderController.listOrders);

/*
 * GET
 */
router.get('/show/:id', requireAuth, orderController.showOrder);

/*
 * POST
 */
router.post('/create', requireAuth, orderController.createOrder);

/*
 * PUT
 */
router.patch('/update/:id', requireAdmin, orderController.updateOrder);

/*
 * DELETE
 */
router.delete('/remove/:id', requireAdmin, orderController.removeOrder);

/*
 * GET
 */
router.get('/my-orders', requireAuth, orderController.listMyOrders);

/*
 * PATCH
 */
router.patch('/my-orders/:id/cancel', requireAuth, orderController.cancelMyOrder); // Add this line

/*
 * GET orders by box ID (for admin panel)
 */
router.get('/by-box/:boxId', requireAuth, requireAdmin, orderController.listOrdersByBox);

module.exports = router;
