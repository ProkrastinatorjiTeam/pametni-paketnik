const mongoose = require('mongoose');
var UnlockEventModel = require('../models/unlockEventModel.js');
var UserModel = require('../models/userModel.js');
var BoxModel = require('../models/boxModel.js');

/**
 * unlockEventController.js
 *
 * @description :: Server-side logic for managing unlockEvents.
 */
module.exports = {

    /**
     * unlockEventController.listUnlockEvents()
     */
    listUnlockEvents: async function (req, res) {
        try {
            const unlockEvents = await UnlockEventModel.find({});
            return res.status(200).json({ message: 'Unlock events retrieved successfully', unlockEvents: unlockEvents });
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                message: 'Error retrieving unlock events',
                error: err.message
            });
        }
    },

    /**
     * unlockEventController.showUnlockEventInfo()
     */
    showUnlockEventInfo: async function (req, res) {
        const id = req.params.id;

        try {
            const unlockEvent = await UnlockEventModel.findOne({_id: id});

            if (!unlockEvent) {
                return res.status(404).json({
                    message: 'Unlock event not found'
                });
            }

            return res.status(200).json({ message: 'Unlock event retrieved successfully', unlockEvent: unlockEvent });
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                message: 'Error retrieving unlock event',
                error: err.message
            });
        }
    },

    selfUnlockEventHistory: async function (req, res) {
        const userId = req.session.userId; // Get user ID from session

        try {
            const unlockEvents = await UnlockEventModel.find({ user: userId }); // Find unlockEvents for the user

            return res.status(200).json({ message: 'Unlock event history retrieved successfully', unlockEvents: unlockEvents });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error retrieving unlock event history', error: err.message });
        }
    },

    userUnlockEventHistory: async function (req, res) {
        const userId = req.params.id; // Get user ID from parameters

        try {
            const unlockEvents = await UnlockEventModel.find({ user: userId }); // Find unlockEvents for the user

            return res.status(200).json({ message: 'Unlock event history retrieved successfully', unlockEvents: unlockEvents });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error retrieving unlock event history', error: err.message });
        }
    },

    /**
     * unlockEventController.createUnlockEvent()
     */
    createUnlockEvent: async function (req, res) {
        const { userId, boxId } = req.body;

        try {
            const user = await UserModel.findById(userId);
            const box = await BoxModel.findById(boxId);

            if (!user || !box) {
                return res.status(404).json({ message: 'User or Box not found' });
            }

            const unlockEvent = new UnlockEventModel({
                user: userId,
                box: boxId,
            });

            const savedUnlockEvent = await unlockEvent.save();

            return res.status(201).json({ message: 'Unlock event created successfully', unlockEvent: savedUnlockEvent });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error creating unlock event', error: err.message });
        }
    },

    /**
     * unlockEventController.updateUnlockEvent()
     */
    updateUnlockEvent: async function (req, res) {
        const id = req.params.id;

        try {
            const unlockEvent = await UnlockEventModel.findOne({_id: id});

            if (!unlockEvent) {
                return res.status(404).json({ message: 'Unlock event not found' });
            }

            // Validate input data
            const updates = {};
            if (req.body.user) updates.user = req.body.user;
            if (req.body.box) updates.box = req.body.box;

            // Update unlockEvent data
            Object.assign(unlockEvent, updates);

            const updatedUnlockEvent = await unlockEvent.save();
            return res.status(200).json({ message: 'Unlock event updated successfully', unlockEvent: updatedUnlockEvent });
        } catch (err) {
            console.error(err);
            if (err.name === 'ValidationError') {
                // Mongoose validation error
                const errors = Object.values(err.errors).map(el => el.message);
                return res.status(400).json({ message: 'Validation error', errors: errors });
            }
            return res.status(500).json({ message: 'Error updating unlock event', error: err.message });
        }
    },

    /**
     * unlockEventController.removeUnlockEvent()
     */
    removeUnlockEvent: async function (req, res) {
        const id = req.params.id;

        try {
            const unlockEvent = await UnlockEventModel.findByIdAndDelete(id);

            if (!unlockEvent) {
                return res.status(404).json({ message: 'Unlock event not found' });
            }

            return res.status(200).json({ message: 'Unlock event deleted successfully' });
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                message: 'Error deleting unlock event',
                error: err.message
            });
        }
    }
};