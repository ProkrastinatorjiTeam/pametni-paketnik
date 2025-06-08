const OrderModel = require('../models/orderModel.js');
const BoxModel = require('../models/boxModel.js');

/**
 * Helper function to check and update order status if printing is complete.
 * This function will now also save the order if updated.
 */
async function checkAndUpdateOrderStatus(order) {
    // Ensure model is populated, has estimatedPrintTime, and order is in a state to be checked
    if (order && order.status === 'printing' && order.startedPrintingAt && 
        order.model && typeof order.model.estimatedPrintTime === 'number' && 
        !order.completedAt) {

        const startTime = new Date(order.startedPrintingAt).getTime();
        const printDurationMs = order.model.estimatedPrintTime * 60 * 1000;
        const expectedCompletionTime = startTime + printDurationMs;

        if (Date.now() >= expectedCompletionTime) {
            order.status = 'ready to pickup';
            order.completedAt = new Date();

            // Authorize user for the box if a box is assigned
            if (order.box) {
                try {
                    const box = await BoxModel.findById(order.box);
                    if (box) {
                        const userId = order.orderBy; // User who placed the order
                        // Ensure userId is a string if comparing with box.authorizedUsers elements
                        const userIdStr = userId.toString();
                        if (!box.authorizedUsers.map(uid => uid.toString()).includes(userIdStr)) {
                            box.authorizedUsers.push(userId); // Mongoose handles casting to ObjectId
                            await box.save();
                        }
                    } else {
                        console.warn(`Box with ID ${order.box} not found for order ${order._id} during auto-completion.`);
                    }
                } catch (boxError) {
                    console.error(`Error authorizing user for box ${order.box} on order ${order._id} completion:`, boxError);
                }
            }
            await order.save(); // Save the updated order
        }
    }
    return order; // Return the potentially modified order
}

module.exports = {
    /**
     * orderController.listOrders()
     */
    listOrders: async function (req, res) {
        try {
            let orders = await OrderModel.find({})
                                        .populate({ path: 'model', select: 'name estimatedPrintTime' })
                                        .populate('orderBy', 'username')
                                        .populate('box', 'name location')
                                        .sort({ createdAt: -1 });

            orders = await Promise.all(orders.map(order => checkAndUpdateOrderStatus(order)));

            return res.json(orders);
        } catch (err) {
            return res.status(500).json({
                message: 'Error when getting orders.',
                error: err.message || err
            });
        }
    },

    /**
     * orderController.showOrder()
     */
    showOrder: async function (req, res) {
        const id = req.params.id;
        try {
            let order = await OrderModel.findById(id)
                                        .populate({ path: 'model', select: 'name estimatedPrintTime' })
                                        .populate('orderBy', 'username')
                                        .populate('box', 'name location');
            if (!order) {
                return res.status(404).json({
                    message: 'No such order'
                });
            }

            order = await checkAndUpdateOrderStatus(order);

            return res.json(order);
        } catch (err) {
            return res.status(500).json({
                message: 'Error when getting order.',
                error: err.message || err
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
            status: 'printing',
            box: req.body.box,
            startedPrintingAt: Date.now(),
        });

        try {
            const savedOrder = await order.save();
            // Populate necessary fields for the response if needed immediately by client
            const populatedOrder = await OrderModel.findById(savedOrder._id)
                                                .populate({ path: 'model', select: 'name estimatedPrintTime' })
                                                .populate('orderBy', 'username')
                                                .populate('box', 'name location');
            return res.status(201).json(populatedOrder);
        } catch (err) {
            return res.status(500).json({
                message: 'Error when creating order',
                error: err.message || err
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

            // Update fields from request body
            const updatableFields = ['model', 'orderBy', 'status', 'box', 'startedPrintingAt', 'completedAt'];
            updatableFields.forEach(field => {
                if (req.body[field] !== undefined) {
                    order[field] = req.body[field];
                }
            });

            // Specific logic for status changes (from previous implementation)
            if (order.status === "printing" && !order.startedPrintingAt && req.body.status === "printing") {
                 order.startedPrintingAt = new Date();
            }

            if (order.status === "ready to pickup" && !order.completedAt && req.body.status === "ready to pickup") {
                order.completedAt = new Date();
                if (order.box) {
                    const box = await BoxModel.findById(order.box);
                    if (box) {
                        const userId = order.orderBy.toString();
                        if (!box.authorizedUsers.map(uid => uid.toString()).includes(userId)) {
                            box.authorizedUsers.push(order.orderBy);
                            await box.save();
                        }
                    }
                } else {
                     return res.status(400).json({ message: 'A box must be assigned to the order when it is ready for pickup.' });
                }
            }

            const updatedOrder = await order.save();
            const populatedOrder = await OrderModel.findById(updatedOrder._id)
                                                .populate({ path: 'model', select: 'name estimatedPrintTime' })
                                                .populate('orderBy', 'username')
                                                .populate('box', 'name location');
            return res.json(populatedOrder);
        } catch (err) {
            return res.status(500).json({
                message: 'Error when updating order.',
                error: err.message || err
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
                error: err.message || err
            });
        }
    },

    /**
     * orderController.listMyOrders()
     */
    listMyOrders: async function (req, res) {
        try {
            if (!req.session || !req.session.userId) {
                return res.status(401).json({ message: 'Not authenticated' });
            }

            let orders = await OrderModel.find({ orderBy: req.session.userId })
                                        .populate({ path: 'model', select: 'name estimatedPrintTime' })
                                        .populate('orderBy', 'username') // Technically redundant if only for current user, but good for consistency
                                        .populate('box', 'name location')
                                        .sort({ createdAt: -1 });

            orders = await Promise.all(orders.map(order => checkAndUpdateOrderStatus(order)));

            return res.json(orders);
        } catch (err) {
            console.error("Error in listMyOrders:", err);
            return res.status(500).json({
                message: 'Error when getting your orders.',
                error: err.message
            });
        }
    },

    /**
     * orderController.cancelMyOrder()
     */
    cancelMyOrder: async function (req, res) {
        const orderId = req.params.id;
        const userId = req.session.userId;

        try {
            const order = await OrderModel.findById(orderId).populate({ path: 'model', select: 'name estimatedPrintTime' });

            if (!order) {
                return res.status(404).json({ message: 'Order not found.' });
            }

            if (order.orderBy.toString() !== userId) {
                return res.status(403).json({ message: 'You are not authorized to cancel this order.' });
            }

            if (order.status !== 'pending' && order.status !== 'printing') {
                return res.status(400).json({ message: `Order cannot be cancelled as it is already ${order.status}.` });
            }

            order.status = 'cancelled';
            // If cancelling a printing order, you might want to set completedAt to now
            // to signify when it was stopped, or leave it null.
            // If it was printing, completedAt might be set to when it was cancelled.
            if (order.startedPrintingAt && !order.completedAt) {
                order.completedAt = new Date(); // Mark cancellation time as completion time
            }

            const updatedOrder = await order.save();
            const populatedOrder = await OrderModel.findById(updatedOrder._id)
                                                .populate({ path: 'model', select: 'name estimatedPrintTime' })
                                                .populate('orderBy', 'username')
                                                .populate('box', 'name location');
            return res.json(populatedOrder);

        } catch (err) {
            console.error("Error in cancelMyOrder:", err);
            return res.status(500).json({
                message: 'Error cancelling order.',
                error: err.message
            });
        }
    },

    /**
     * orderController.listOrdersByBox()
     * Lists all orders associated with a specific box.
     */
    listOrdersByBox: async function (req, res) {
        try {
            const { boxId } = req.params;
            if (!boxId) {
                return res.status(400).json({ message: 'Box ID is required.' });
            }

            let orders = await OrderModel.find({ box: boxId })
                                        .populate({ path: 'model', select: 'name estimatedPrintTime' })
                                        .populate('orderBy', 'username')
                                        // .populate('box', 'name location') // Box details are known since we are querying by boxId
                                        .sort({ createdAt: -1 });

            // Optionally, update status if needed, though for history it might not be critical
            // orders = await Promise.all(orders.map(order => checkAndUpdateOrderStatus(order)));

            return res.json(orders);
        } catch (err) {
            console.error("Error in listOrdersByBox:", err);
            return res.status(500).json({
                message: 'Error when getting orders for the specified box.',
                error: err.message || err
            });
        }
    },
};
