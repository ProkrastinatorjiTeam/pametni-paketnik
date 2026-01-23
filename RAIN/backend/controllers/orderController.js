const OrderModel = require('../models/orderModel.js');
const BoxModel = require('../models/boxModel.js');

/**
 * Helper function to check and update order status if preparation is complete.
 */
async function checkAndUpdateOrderStatus(order) {
    if (
        order &&
        order.status === 'preparing' &&
        order.startedPreparingAt &&
        order.product?.estimatedPrintTime > 0 &&
        !order.completedAt
    ) {
        const prepTimeMinutes = 1;
        const startTime = new Date(order.startedPreparingAt).getTime();
        const expectedCompletion = startTime + prepTimeMinutes * 60 * 1000;

        if (Date.now() >= expectedCompletion) {
            order.status = 'ready for pickup';
            order.completedAt = new Date();

            if (order.box) {
                const box = await BoxModel.findById(order.box);
                if (box) {
                    const userIdStr = order.orderBy.toString();
                    if (!box.authorizedUsers.map(u => u.toString()).includes(userIdStr)) {
                        box.authorizedUsers.push(order.orderBy);
                        await box.save();
                    }
                }
            }

            await order.save();
        }
    }
    return order;
}

module.exports = {
    // GET all orders
    listOrders: async (req, res) => {
        try {
            let orders = await OrderModel.find()
                .populate({path: 'product', select: 'name price estimatedPrintTime'})
                .populate('orderBy', 'username')
                .populate('box', 'name location')
                .sort({createdAt: -1});

            orders = await Promise.all(orders.map(checkAndUpdateOrderStatus));
            return res.json(orders);
        } catch (err) {
            return res.status(500).json({message: 'Error getting orders', error: err.message});
        }
    },

    // GET single order
    showOrder: async (req, res) => {
        try {
            let order = await OrderModel.findById(req.params.id)
                .populate({path: 'product', select: 'name price estimatedPrintTime'})
                .populate('orderBy', 'username')
                .populate('box', 'name location');

            if (!order) return res.status(404).json({message: 'Order not found'});

            order = await checkAndUpdateOrderStatus(order);
            return res.json(order);
        } catch (err) {
            return res.status(500).json({message: 'Error getting order', error: err.message});
        }
    },

    createOrder: async (req, res) => {
        try {
            const {product, box, quantity} = req.body;

            if (!product || !box) {
                return res.status(400).json({message: 'Product and box are required'});
            }

            const selectedBox = await BoxModel.findById(box);

            if (!selectedBox) {
                return res.status(404).json({message: 'Box not found'});
            }

            if (selectedBox.isBusy) {
                return res.status(400).json({message: 'Selected box is currently busy. Please choose another one.'});
            }

            const order = new OrderModel({
                product,
                box,
                orderBy: req.session.userId,
                quantity: quantity || 1,
                status: 'pending'
            });

            await order.save();

            await BoxModel.findByIdAndUpdate(box, {isBusy: true});

            res.status(201).json(order);
        } catch (err) {
            res.status(500).json({message: 'Failed to create order', error: err.message});
        }
    },

    // PUT update order
    updateOrder: async (req, res) => {
        try {
            const order = await OrderModel.findById(req.params.id);
            if (!order) return res.status(404).json({message: 'Order not found'});

            if (req.body.status === 'ready for pickup') {
                order.status = 'ready for pickup';
                order.completedAt = new Date();

                // autorizacija boxa
                const box = await BoxModel.findById(order.box);
                if (box) {
                    const uid = order.orderBy.toString();
                    if (!box.authorizedUsers.map(u => u.toString()).includes(uid)) {
                        box.authorizedUsers.push(order.orderBy);
                        await box.save();
                    }
                }
            }

            await order.save();
            res.json(order);
        } catch (err) {
            res.status(500).json({message: 'Error updating order', error: err.message});
        }
    },

    // DELETE order
    removeOrder: async (req, res) => {
        try {
            const order = await OrderModel.findByIdAndDelete(req.params.id);

            if (!order) {
                return res.status(404).json({message: 'Order not found'});
            }

            if (order.box) {
                await BoxModel.findByIdAndUpdate(order.box, {
                    $set: {isBusy: false},
                    $pull: {authorizedUsers: order.orderBy}
                });
            }

            return res.status(204).send();
        } catch (err) {
            return res.status(500).json({message: 'Error deleting order', error: err.message});
        }
    },

    // GET my orders
    listMyOrders: async (req, res) => {
        try {
            if (!req.session.userId) {
                return res.status(401).json({message: 'Not authenticated'});
            }

            let orders = await OrderModel.find({orderBy: req.session.userId})
                .populate('product') // ✅ brez estimatedPrintTime
                .populate('box', 'name location')
                .sort({createdAt: -1});

            orders = await Promise.all(orders.map(checkAndUpdateOrderStatus));

            res.json(orders);
        } catch (err) {
            res.status(500).json({
                message: 'Error getting your orders',
                error: err.message
            });
        }
    },

    // Cancel my order
    cancelMyOrder: async (req, res) => {
        try {
            const order = await OrderModel.findById(req.params.id).populate({path: 'product', select: 'name'});
            if (!order) return res.status(404).json({message: 'Order not found'});

            if (order.orderBy.toString() !== req.session.userId)
                return res.status(403).json({message: 'Not authorized'});

            if (!['pending', 'reserved'].includes(order.status))
                return res.status(400).json({message: `Cannot cancel order with status ${order.status}`});

            order.status = 'cancelled';
            if (order.startedPreparingAt && !order.completedAt) order.completedAt = new Date();

            if (order.box) {
                await BoxModel.findByIdAndUpdate(order.box, {
                    $set: {isBusy: false},
                    $pull: {authorizedUsers: order.orderBy}
                });
            }

            const updatedOrder = await order.save();
            const populatedOrder = await OrderModel.findById(updatedOrder._id)
                .populate({path: 'product', select: 'name price estimatedPrintTime'})
                .populate('orderBy', 'username')
                .populate('box', 'name location');

            return res.json(populatedOrder);
        } catch (err) {
            return res.status(500).json({message: 'Error cancelling order', error: err.message});
        }
    },

    // List orders by box
    listOrdersByBox: async (req, res) => {
        try {
            const orders = await OrderModel.find({box: req.params.boxId})
                .populate({path: 'product', select: 'name price estimatedPrintTime'})
                .populate('orderBy', 'username')
                .sort({createdAt: -1});

            return res.json(orders);
        } catch (err) {
            return res.status(500).json({message: 'Error getting orders for box', error: err.message});
        }
    },

    listOrdersByUserId: async (req, res) => {
        try {
            const userId = req.params.userId;
            if (!userId) return res.status(400).json({message: 'User ID is required'});

            let orders = await OrderModel.find({orderBy: userId})
                .populate({path: 'product', select: 'name price estimatedPrintTime'})
                .populate('orderBy', 'username')
                .populate('box', 'name location')
                .sort({createdAt: -1});

            orders = await Promise.all(orders.map(checkAndUpdateOrderStatus));

            return res.status(200).json({
                message: `Orders for user ${userId} retrieved successfully`,
                orders
            });
        } catch (err) {
            console.error('Error in listOrdersByUserId:', err);
            return res.status(500).json({
                message: 'Error getting orders for specified user',
                error: err.message
            });
        }
    },

    updateOrderStatus: async (req, res) => {
        try {
            const {status} = req.body;

            const validStatuses = ['ready for pickup', 'cancelled'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({message: 'Invalid status'});
            }

            const order = await OrderModel.findById(req.params.id)
                .populate('orderBy', '_id username')
                .populate('product', 'name price')
                .populate('box', '_id name location authorizedUsers');

            if (!order) {
                console.log('Order not found:', req.params.id);
                return res.status(404).json({message: 'Order not found'});
            }

            order.status = status;

            if (status === 'ready for pickup') {
                order.completedAt = new Date();
            } else {
                order.completedAt = undefined;
            }

            await order.save();


            if (status === 'ready for pickup') {
                const box = order.box;
                const userId = order.orderBy._id;
                const userIdStr = userId.toString();

                if (!box.authorizedUsers.map(u => u.toString()).includes(userIdStr)) {
                    box.authorizedUsers.push(userId);
                    await box.save();
                }

            } else if (status === 'cancelled') {
                if (order.box) {
                    await BoxModel.findByIdAndUpdate(order.box._id, {
                        $set: {isBusy: false},
                        $pull: {authorizedUsers: order.orderBy._id}
                    });
                }
            }

            const populated = await OrderModel.findById(order._id)
                .populate('product', 'name price')
                .populate('orderBy', 'username')
                .populate('box', 'name location');

            res.json(populated);

        } catch (err) {
            res.status(500).json({
                message: 'Failed to update order status',
                error: err.message
            });
        }
    }
};
