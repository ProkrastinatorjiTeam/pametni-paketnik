var OrderModel = require('../models/orderModel.js');

/**
 * orderController.js
 *
 * @description :: Server-side logic for managing orders.
 */
module.exports = {

    /**
     * orderController.list()
     */
    listOrders: function (req, res) {
        OrderModel.find(function (err, orders) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when getting order.',
                    error: err
                });
            }

            return res.json(orders);
        });
    },

    /**
     * orderController.show()
     */
    showOrder: function (req, res) {
        var id = req.params.id;

        OrderModel.findOne({_id: id}, function (err, order) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when getting order.',
                    error: err
                });
            }

            if (!order) {
                return res.status(404).json({
                    message: 'No such order'
                });
            }

            return res.json(order);
        });
    },

    /**
     * orderController.create()
     */
    createOrder: function (req, res) {
        var order = new OrderModel({
			model : req.body.model,
			orderBy : req.body.orderBy,
			status : req.body.status,
			box : req.body.box,
			createdAt : req.body.createdAt,
			startedPrintingAt : req.body.startedPrintingAt,
			completedAt : req.body.completedAt
        });

        order.save(function (err, order) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when creating order',
                    error: err
                });
            }

            return res.status(201).json(order);
        });
    },

    /**
     * orderController.update()
     */
    updateOrder: function (req, res) {
        var id = req.params.id;

        OrderModel.findOne({_id: id}, function (err, order) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when getting order',
                    error: err
                });
            }

            if (!order) {
                return res.status(404).json({
                    message: 'No such order'
                });
            }

            order.model = req.body.model ? req.body.model : order.model;
			order.orderBy = req.body.orderBy ? req.body.orderBy : order.orderBy;
			order.status = req.body.status ? req.body.status : order.status;
			order.box = req.body.box ? req.body.box : order.box;
			order.createdAt = req.body.createdAt ? req.body.createdAt : order.createdAt;
			order.startedPrintingAt = req.body.startedPrintingAt ? req.body.startedPrintingAt : order.startedPrintingAt;
			order.completedAt = req.body.completedAt ? req.body.completedAt : order.completedAt;
			
            order.save(function (err, order) {
                if (err) {
                    return res.status(500).json({
                        message: 'Error when updating order.',
                        error: err
                    });
                }

                return res.json(order);
            });
        });
    },

    /**
     * orderController.remove()
     */
    removeOrder: function (req, res) {
        var id = req.params.id;

        OrderModel.findByIdAndRemove(id, function (err, order) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when deleting the order.',
                    error: err
                });
            }

            return res.status(204).json();
        });
    }
};
