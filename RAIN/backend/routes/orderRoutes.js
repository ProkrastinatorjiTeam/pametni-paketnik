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
router.get('/:id', requireAuth, orderController.showOrder);

/*
 * POST
 */
router.post('/', requireAuth, orderController.createOrder);

/*
 * PUT
 */
router.put('/:id', requireAdmin, orderController.updateOrder);

/*
 * DELETE
 */
router.delete('/:id', requireAdmin, orderController.removeOrder);

module.exports = router;
