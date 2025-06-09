// controllers/statsController.js

const Order = require('../models/orderModel');
const User = require('../models/userModel');
const Box = require('../models/boxModel');
const Model3D = require('../models/model3DModel');

exports.getOverviewStats = async (req, res) => {
    try {
        // Uporabimo Promise.all, da vse poizvedbe tečejo hkrati
        const [
            totalOrders,
            userCount,
            totalBoxCount,
            busyBoxIds,
            revenueData
        ] = await Promise.all([
            Order.countDocuments(),
            User.countDocuments(),
            Box.countDocuments(), // 1. Preštejemo VSE boxe v sistemu
            // 2. Poiščemo ID-je vseh boxov, ki so vezani na naročila s statusom 'printing' ALI 'pending'
            Order.find({ status: { $in: ['printing', 'pending'] } }).distinct('box'),
            // Poizvedba za prihodke ostane enaka
            Order.aggregate([
                { $match: { status: { $in: ['ready to pickup', 'done'] } } },
                {
                    $lookup: { from: 'model3ds', localField: 'model', foreignField: '_id', as: 'productDetails' }
                },
                { $unwind: '$productDetails' },
                {
                    $group: { _id: null, totalRevenue: { $sum: '$productDetails.price' } }
                }
            ])
        ]);

        // 3. Izračunamo število prostih boxov
        const availableBoxes = totalBoxCount - busyBoxIds.length;

        const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

        res.status(200).json({
            totalOrders,
            userCount,
            availableBoxes, // 4. V odgovor vključimo pravilno izračunano vrednost
            totalRevenue
        });

    } catch (error) {
        console.error("Napaka pri pridobivanju preglednih statistik:", error);
        res.status(500).json({ message: "Napaka na strežniku." });
    }
};


// --- 2. GET /stats/top-products ---
// Agregacija za štetje, kateri izdelki so bili največkrat naročeni
exports.getTopProducts = async (req, res) => {
    try {
        const topProducts = await Order.aggregate([
            // 1. Združi naročila po ID-ju modela in preštej vsakega
            {
                $group: {
                    _id: '$model', // Grupiraj po `model` polju
                    orderCount: { $sum: 1 } // Preštej, kolikokrat se pojavi vsak ID
                }
            },
            // 2. Razvrsti padajoče glede na število naročil
            { $sort: { orderCount: -1 } },
            // 3. Omeji na top 5
            { $limit: 5 },
            // 4. Poveži z `model3ds` kolekcijo, da dobiš ime izdelka
            {
                $lookup: {
                    from: 'model3ds',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            // 5. "Razpakiraj" polje productInfo
            { $unwind: '$productInfo' },
            // 6. Oblikuj izhodne podatke
            {
                $project: {
                    _id: 0, // Ne potrebujemo ID-ja iz agregacije
                    name: '$productInfo.name',
                    orderCount: '$orderCount'
                }
            }
        ]);

        res.status(200).json(topProducts);

    } catch (error) {
        console.error("Napaka pri pridobivanju najbolj prodajanih izdelkov:", error);
        res.status(500).json({ message: "Napaka na strežniku." });
    }
};


// --- 3. GET /stats/recent-orders ---
// Pridobi zadnjih nekaj naročil
exports.getRecentOrders = async (req, res) => {
    try {
        const recentOrders = await Order.find()
            .sort({ createdAt: -1 }) // Razvrsti po datumu nastanka, najnovejši najprej
            .limit(5) // Vrne zadnjih 5 naročil
            .populate('model', 'name') // Pridobi samo ime modela
            .populate('orderBy', 'username'); // Pridobi samo uporabniško ime naročnika

        res.status(200).json(recentOrders);

    } catch (error) {
        console.error("Napaka pri pridobivanju zadnjih naročil:", error);
        res.status(500).json({ message: "Napaka na strežniku." });
    }
};