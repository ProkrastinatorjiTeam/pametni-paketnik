const mongoose = require('mongoose');
var UnlockModel = require('../models/unlockModel.js');
var UserModel = require('../models/userModel.js');
var BoxModel = require('../models/boxModel.js');

/**
 * unlockController.js
 *
 * @description :: Server-side logic for managing unlocks.
 */
module.exports = {

    /**
     * unlockController.listUnlocks()
     */
    listUnlocks: async function (req, res) {
        try {
            const unlocks = await UnlockModel.find({});
            return res.status(200).json({ message: 'Unlocks retrieved successfully', unlocks: unlocks });
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                message: 'Error retrieving unlocks',
                error: err.message
            });
        }
    },

    /**
     * unlockController.showUnlockInfo()
     */
    showUnlockInfo: async function (req, res) {
        const id = req.params.id;

        try {
            const unlock = await UnlockModel.findOne({_id: id});

            if (!unlock) {
                return res.status(404).json({
                    message: 'Unlock not found'
                });
            }

            return res.status(200).json({ message: 'Unlock retrieved successfully', unlock: unlock });
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                message: 'Error retrieving unlock',
                error: err.message
            });
        }
    },

    selfUnlockHistory: async function (req, res) {
        const userId = req.session.userId; // Get user ID from session

        try {
            const unlocks = await UnlockModel.find({ user: userId }); // Find unlocks for the user

            return res.status(200).json({ message: 'Unlock history retrieved successfully', unlocks: unlocks });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error retrieving unlock history', error: err.message });
        }
    },

    userUnlockHistory: async function (req, res) {
        const userId = req.params.id; // Get user ID from parameters

        try {
            const unlocks = await UnlockModel.find({ user: userId }); // Find unlocks for the user

            return res.status(200).json({ message: 'Unlock history retrieved successfully', unlocks: unlocks });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error retrieving unlock history', error: err.message });
        }
    },

    /**
     * unlockController.create()
     */

    /**
     * unlockController.updateUnlock()
     */
    updateUnlock: async function (req, res) {
        const id = req.params.id;

        try {
            const unlock = await UnlockModel.findOne({_id: id});

            if (!unlock) {
                return res.status(404).json({ message: 'Unlock not found' });
            }

            // Validate input data
            const updates = {};
            if (req.body.user) updates.user = req.body.user;
            if (req.body.locker) updates.locker = req.body.locker;

            // Update unlock data
            Object.assign(unlock, updates);

            const updatedUnlock = await unlock.save();
            return res.status(200).json({ message: 'Unlock updated successfully', unlock: updatedUnlock });
        } catch (err) {
            console.error(err);
            if (err.name === 'ValidationError') {
                // Mongoose validation error
                const errors = Object.values(err.errors).map(el => el.message);
                return res.status(400).json({ message: 'Validation error', errors: errors });
            }
            return res.status(500).json({ message: 'Error updating unlock', error: err.message });
        }
    },

    /**
     * unlockController.removeUnlock()
     */
    removeUnlock: async function (req, res) {
        const id = req.params.id;

        try {
            const unlock = await UnlockModel.findByIdAndDelete(id);

            if (!unlock) {
                return res.status(404).json({ message: 'Unlock not found' });
            }

            return res.status(200).json({ message: 'Unlock deleted successfully' });
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                message: 'Error deleting unlock',
                error: err.message
            });
        }
    },

    createUnlock: async function (req, res) {
        const { userId, lockerId } = req.body;

        try {
            const user = await UserModel.findById(userId);
            const box = await BoxModel.findById(lockerId); // Changed this line

            if (!user || !box) { // Changed this line
                return res.status(404).json({ message: 'User or Box not found' }); // Changed this line
            }

            // **Authorization Check (Critical)**
            if (!box.authorizedUsers.includes(userId)) { // Changed this line
                return res.status(403).json({ message: 'User is not authorized to unlock this box' }); // Changed this line
            }

            const unlock = new UnlockModel({
                user: userId,
                locker: lockerId,
            });

            const savedUnlock = await unlock.save();

            return res.status(201).json({ message: 'Unlock created successfully', unlock: savedUnlock });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error creating unlock', error: err.message });
        }
    },

    /**
     * unlockController.addUnlock()
     * Creates a new unlock for the logged-in user using boxId.
     */
    addUnlock: async function (req, res) {
        const userId = req.session.userId; // Get user ID from session
        const { boxId } = req.body; // Get boxId from request body

        try {
            // Find the box by boxId
            const box = await BoxModel.findOne({ boxId: boxId }); // Changed this line

            if (!box) { // Changed this line
                return res.status(404).json({ message: 'Box not found' }); // Changed this line
            }

            // **Authorization Check (Critical)**
            if (!box.authorizedUsers.includes(userId)) { // Changed this line
                return res.status(403).json({ message: 'User is not authorized to unlock this box' }); // Changed this line
            }

            const unlock = new UnlockModel({
                user: userId,
                locker: box._id, // Use the box's _id // Changed this line
            });

            const savedUnlock = await unlock.save();

            return res.status(201).json({ message: 'Unlock recorded successfully', unlock: savedUnlock });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error recording unlock', error: err.message });
        }
    }
};