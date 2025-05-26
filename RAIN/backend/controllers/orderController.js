const OrderModel = require('../models/orderModel.js');
const BoxModel = require('../models/boxModel.js');

/**
 * orderController.js
 *
 * @description :: Server-side logic for managing orders.
 */
module.exports = {
    /**
     * orderController.listOrders()
     */
    listOrders: async function (req, res) {
        try {
            const orders = await OrderModel.find();
            return res.json(orders);
        } catch (err) {
            return res.status(500).json({
                message: 'Error when getting orders.',
                error: err
            });
        }
    },

    /**
     * orderController.showOrder()
     */
    showOrder: async function (req, res) {
        const id = req.params.id;
        try {
            const order = await OrderModel.findById(id);
            if (!order) {
                return res.status(404).json({
                    message: 'No such order'
                });
            }
            return res.json(order);
        } catch (err) {
            return res.status(500).json({
                message: 'Error when getting order.',
                error: err
            });
        }
    },

    /**
     * orderController.createOrder()
     */
    createOrder: async function (req, res) {
        const order = new OrderModel({
            model: req.body.model,
            orderBy: req.session.userId,
            status: req.body.status,
            box: req.body.box,
            createdAt: req.body.createdAt,
            startedPrintingAt: req.body.startedPrintingAt,
            completedAt: req.body.completedAt
        });

        try {
            const savedOrder = await order.save();
            return res.status(201).json(savedOrder);
        } catch (err) {
            return res.status(500).json({
                message: 'Error when creating order',
                error: err
            });
        }
    },

    /**
     * orderController.updateOrder()
     */
    updateOrder: async function (req, res) {
        const id = req.params.id;
        try {
            const order = await OrderModel.findById(id);
            if (!order) {
                return res.status(404).json({
                    message: 'No such order'
                });
            }

            order.model = req.body.model ?? order.model;
            order.orderBy = req.body.orderBy ?? order.orderBy;
            order.status = req.body.status ?? order.status;
            order.box = req.body.box ?? order.box;
            order.createdAt = req.body.createdAt ?? order.createdAt;

            if (req.body.status === "printing" && !order.startedPrintingAt) {
                order.startedPrintingAt = new Date();
            }

            if (req.body.status === "ready to pickup" && !order.completedAt) {
                order.completedAt = new Date();

                if (req.body.box) {
                    order.box = req.body.box;

                    const box = await BoxModel.findById(req.body.box);
                    if (!box) {
                        return res.status(404).json({message: 'Box not found'});
                    }

                    const userId = order.orderBy;
                    if (!box.authorizedUsers.includes(userId)) {
                        box.authorizedUsers.push(userId);
                        await box.save();
                    }
                }
            }

            const updatedOrder = await order.save();
            return res.json(updatedOrder);
        } catch (err) {
            return res.status(500).json({
                message: 'Error when updating order.',
                error: err
            });
        }
    },

    /**
     * orderController.removeOrder()
     */
    removeOrder: async function (req, res) {
        const id = req.params.id;
        try {
            await OrderModel.findByIdAndRemove(id);
            return res.status(204).json();
        } catch (err) {
            return res.status(500).json({
                message: 'Error when deleting the order.',
                error: err
            });
        }
    }
};
