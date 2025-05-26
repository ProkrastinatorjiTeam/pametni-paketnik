var express = require('express');
var router = express.Router();
var orderController = require('../controllers/orderController.js');
const UserModel = require("../models/userModel");

function requireAdmin(req, res, next) {
    if (req.session && req.session.userId) {
        UserModel.findById(req.session.userId)
            .then(user => {
                if (user && user.role === 'admin') {
                    next();
                } else {
                    res.status(403).json({message: 'Access denied. Admins only.'});
                }
            })
            .catch(err => {
                res.status(500).json({message: 'Server error'});
            });
    } else {
        res.status(401).json({message: 'Not authenticated'});
    }
}

function requireAuth(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    } else {
        res.status(401).json({message: 'You need to login to view this page.'});
    }
}

/*
 * GET
 */
router.get('/', requireAdmin, orderController.listOrders);

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
