const {recommendProducts} = require('../services/recommendationService');
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const rules = require('../data/rules.json');

const getRecommendations = async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({message: 'Not authenticated'});
        }

        const orders = await Order.find({
            orderBy: req.session.userId,
            status: "done"
        }).populate("product");

        const userItems = [
            ...new Set(orders.map(o => o.product.name.toLowerCase()))
        ];

        const recommendations = recommendProducts(userItems, rules);

        if (recommendations.length === 0) {
            return res.json({recommendations: []});
        }

        const namesToFind = recommendations.map(r => r.product);

        const fullProducts = await Product.find({
            name: {$in: namesToFind.map(name => new RegExp(`^${name}$`, 'i'))}
        });

        const finalRecommendations = fullProducts.map(product => {
            const ruleInfo = recommendations.find(r => r.product.toLowerCase() === product.name.toLowerCase());

            return {
                ...product.toObject(),
                confidence: ruleInfo ? ruleInfo.confidence : 0,
            };
        });

        res.json({
            userItems,
            recommendations: finalRecommendations
        });
    } catch (err) {
        res.status(500).json({error: err.message});
    }
};

module.exports = {getRecommendations};
