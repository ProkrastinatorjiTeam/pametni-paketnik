var LockerModel = require('../models/lockerModel.js');
var UserModel = require('../models/userModel.js');

/**
 * lockerController.js
 *
 * @description :: Server-side logic for managing lockers.
 */
module.exports = {

    /**
     * lockerController.list()
     */
    listLockers: async function (req, res) {
        try {
            const lockers = await LockerModel.find({});
            return res.status(200).json({ message: 'Lockers retrieved successfully', lockers: lockers });
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                message: 'Error retrieving lockers',
                error: err.message
            });
        }
    },

    /**
     * lockerController.show()
     */
    showLockerInfo: async function (req, res) {
        const id = req.params.id;

        try {
            const locker = await LockerModel.findOne({_id: id}).populate('allowedToOpen');

            if (!locker) {
                return res.status(404).json({
                    message: 'Locker not found'
                });
            }

            return res.status(200).json({ message: 'Locker retrieved successfully', locker: locker });
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                message: 'Error retrieving locker',
                error: err.message
            });
        }
    },

    assignLocker: async function (req, res) {
        const lockerId = req.params.id;
        const userId = req.body.userId;

        try {
            const locker = await LockerModel.findById(lockerId);
            const user = await UserModel.findById(userId);

            if (!locker) {
                return res.status(404).json({ message: 'Locker not found' });
            }

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Check if the user is already allowed to open the locker
            if (locker.allowedToOpen.includes(userId)) {
                return res.status(400).json({ message: 'User is already allowed to open this locker' });
            }

            locker.allowedToOpen.push(userId);
            await locker.save();

            return res.status(200).json({ message: 'User allowed to open locker successfully', locker: locker });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error allowing user to open locker', error: err.message });
        }
    },

    authorizeUser: async function (req, res) {
        const userId = req.body.userId;
        const id = req.body.id;
        const boxId = req.body.boxId;

        try {
            let locker;

            if (id) {
                // If lockerId is provided, use it to find the locker
                locker = await LockerModel.findById(id);
            } else if (boxId) {
                // If boxId is provided, use it to find the locker
                locker = await LockerModel.findOne({ boxId: boxId });
            } else {
                return res.status(400).json({ message: 'Locker ID or box ID is required' });
            }

            if (!locker) {
                return res.status(404).json({ message: 'Locker not found' });
            }

            // Check if the user is allowed to open the locker
            const isAllowed = locker.allowedToOpen.includes(userId);

            return res.status(200).json({ authorized: isAllowed });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error checking authorization', error: err.message });
        }
    },

    /**
     * lockerController.create()
     */
    createLocker: async function (req, res) {
        try {
            const locker = new LockerModel({
                name: req.body.name,
                location: req.body.location,
                label: req.body.label,
                boxId: req.body.boxId, // Add this line
                status: req.body.status,
            });

            const savedLocker = await locker.save();
            return res.status(201).json({ message: 'Locker created successfully', locker: savedLocker });
        } catch (err) {
            console.error(err);
            if (err.name === 'ValidationError') {
                // Mongoose validation error
                const errors = Object.values(err.errors).map(el => el.message);
                return res.status(400).json({ message: 'Validation error', errors: errors });
            }
            return res.status(500).json({
                message: 'Error creating locker',
                error: err.message
            });
        }
    },

    /**
     * lockerController.update()
     */
    updateLocker: async function (req, res) {
        const id = req.params.id;

        try {
            const locker = await LockerModel.findOne({_id: id});

            if (!locker) {
                return res.status(404).json({ message: 'Locker not found' });
            }

            // Validate input data
            const updates = {};
            if (req.body.name) updates.name = req.body.name;
            if (req.body.location) updates.location = req.body.location;
            if (req.body.label) updates.label = req.body.label;
            if (req.body.boxId) updates.boxId = req.body.boxId; // Add this line
            if (req.body.status) updates.status = req.body.status;

            // Update locker data
            Object.assign(locker, updates);

            const updatedLocker = await locker.save();
            return res.status(200).json({ message: 'Locker updated successfully', locker: updatedLocker });
        } catch (err) {
            console.error(err);
            if (err.name === 'ValidationError') {
                // Mongoose validation error
                const errors = Object.values(err.errors).map(el => el.message);
                return res.status(400).json({ message: 'Validation error', errors: errors });
            }
            return res.status(500).json({ message: 'Error updating locker', error: err.message });
        }
    },

    /**
     * lockerController.remove()
     */
    removeLocker: async function (req, res) {
        const id = req.params.id;

        try {
            const locker = await LockerModel.findByIdAndDelete(id);

            if (!locker) {
                return res.status(404).json({ message: 'Locker not found' });
            }

            return res.status(200).json({ message: 'Locker deleted successfully' });
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                message: 'Error deleting locker',
                error: err.message
            });
        }
    },

    showAddForm: async function (req, res) {
        res.render('locker/add');
    }
};