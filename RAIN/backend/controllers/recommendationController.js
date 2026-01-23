const { recommendProducts } = require('../services/recommendationService');
const Order = require('../models/orderModel');
const rules = require('../data/rules.json');

const getRecommendations = async (req, res) => {
    try {
        const userId = req.params.userId;

        const orders = await Order.find({
            orderBy: userId,
            status: "done"
        }).populate("product");

        const userItems = [
            ...new Set(orders.map(o => o.product.name))
        ];

        const recommendations = recommendProducts(userItems, rules);

        res.json({
            userItems,
            recommendations
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getRecommendations };
