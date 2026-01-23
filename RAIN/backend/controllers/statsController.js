// controllers/statsController.js

const Order = require('../models/orderModel');
const User = require('../models/userModel');
const Box = require('../models/boxModel');
const Product = require('../models/productModel');

// --- 1. GET /stats/overview ---
exports.getOverviewStats = async (req, res) => {
    try {
        const [
            totalOrders,
            userCount,
            totalBoxCount,
            busyBoxIds,
            revenueData
        ] = await Promise.all([
            Order.countDocuments(),
            User.countDocuments(),
            Box.countDocuments(),
            Order.find({status: {$in: ['reserved', 'printing', 'pending']}}).distinct('box'),
            // Prihodki upoštevajo quantity
            Order.aggregate([
                {$match: {status: {$in: ['ready for pickup', 'done']}}},
                {
                    $lookup: {
                        from: 'products',
                        localField: 'product',
                        foreignField: '_id',
                        as: 'productDetails'
                    }
                },
                {$unwind: '$productDetails'},
                {
                    $group: {
                        _id: null,
                        totalRevenue: {$sum: {$multiply: ['$productDetails.price', '$quantity']}}
                    }
                }
            ])
        ]);

        const availableBoxes = totalBoxCount - busyBoxIds.length;
        const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

        res.status(200).json({
            totalOrders,
            userCount,
            availableBoxes,
            totalRevenue
        });

    } catch (error) {
        console.error("Napaka pri pridobivanju preglednih statistik:", error);
        res.status(500).json({message: "Napaka na strežniku."});
    }
};

// --- 2. GET /stats/top-products ---
exports.getTopProducts = async (req, res) => {
    try {
        const topProducts = await Order.aggregate([
            // DODAN FILTRIRNI KORAK ZA STATUS NAROČILA
            {
                $match: {
                    status: {$in: ['ready for pickup', 'completed', 'done']} // Prilagodi te statuse svojim dejanskim dokončanim statusom
                    // Morda 'ready for pickup' (kot smo imeli prej) ali 'ready for pickup' (kar imaš v validaciji)
                }
            },
            // Grupiraj po produktu in seštej količino
            {
                $group: {
                    _id: '$product',
                    totalOrdered: {$sum: '$quantity'}
                }
            },
            {$sort: {totalOrdered: -1}},
            {$limit: 5},
            {
                $lookup: {
                    from: 'products', // Ime kolekcije 'products'
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            {$unwind: '$productInfo'},
            {
                $project: {
                    _id: 0,
                    name: '$productInfo.name',
                    totalOrdered: 1
                }
            }
        ]);

        res.status(200).json(topProducts);

    } catch (error) {
        console.error("Napaka pri pridobivanju najbolj prodajanih izdelkov:", error);
        res.status(500).json({message: "Napaka na strežniku."});
    }
};

// --- 3. GET /stats/recent-orders ---
exports.getRecentOrders = async (req, res) => {
    try {
        const recentOrders = await Order.find()
            .sort({createdAt: -1})
            .limit(5)
            .populate('product', 'name price')
            .populate('orderBy', 'username');

        res.status(200).json(recentOrders);

    } catch (error) {
        console.error("Napaka pri pridobivanju zadnjih naročil:", error);
        res.status(500).json({message: "Napaka na strežniku."});
    }
};
