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
router.delete('remove/:id', requireAdmin, orderController.removeOrder);

module.exports = router;
