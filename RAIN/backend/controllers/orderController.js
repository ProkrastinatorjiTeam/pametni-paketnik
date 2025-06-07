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
            const orders = await OrderModel.find()
                                        .populate('model', 'name') // Populate model and select only the name
                                        .populate('orderBy', 'username'); // Populate user and select only the username
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
            const order = await OrderModel.findById(id)
                                        .populate('model', 'name')
                                        .populate('orderBy', 'username');
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
            status: 'printing', // Set status to 'printing'
            box: req.body.box,
            // createdAt is set by default
            startedPrintingAt: Date.now(), // Set startedPrintingAt time
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
            // createdAt should generally not be updated manually after creation

            if (req.body.status === "printing" && !order.startedPrintingAt) {
                order.startedPrintingAt = new Date();
            } else if (req.body.startedPrintingAt) {
                order.startedPrintingAt = req.body.startedPrintingAt;
            }

            if (req.body.status === "ready to pickup" && !order.completedAt) {
                order.completedAt = new Date();

                if (req.body.box) { // Ensure box is assigned if status is ready to pickup
                    order.box = req.body.box;

                    const box = await BoxModel.findById(req.body.box);
                    if (!box) {
                        return res.status(404).json({message: 'Box not found for order completion'});
                    }

                    const userId = order.orderBy; // User who placed the order
                    if (!box.authorizedUsers.includes(userId)) {
                        box.authorizedUsers.push(userId);
                        await box.save();
                    }
                } else if (!order.box) { // If no box is assigned when moving to ready to pickup
                    return res.status(400).json({ message: 'A box must be assigned to the order when it is ready for pickup.' });
                }
            } else if (req.body.completedAt) {
                order.completedAt = req.body.completedAt;
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
