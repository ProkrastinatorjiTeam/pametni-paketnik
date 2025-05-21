var UnlockEventModel = require('../models/unlockEventModel.js');
var UserModel = require('../models/userModel.js');
var BoxModel = require('../models/boxModel.js');

module.exports = {

    // List all unlock events (admin only)
    listUnlockEvents: async function (req, res) {
        try {
            // Fetch all unlock events from the database
            const unlockEvents = await UnlockEventModel.find({});

            // Respond with the list of unlock events
            return res.status(200).json({ message: 'Unlock events retrieved successfully', unlockEvents: unlockEvents });

            // Handle errors
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                message: 'Error retrieving unlock events',
                error: err.message
            });
        }
    },

    
    // Show details for a specific unlock event (admin only)
    showUnlockEvent: async function (req, res) {
        const id = req.params.id;

        try {
            // Retrieve the unlock event from the database
            const unlockEvent = await UnlockEventModel.findOne({ _id: id });

            // Handle case where unlock event is not found
            if (!unlockEvent) {
                return res.status(404).json({
                    message: 'Unlock event not found'
                });
            }

            // Respond with the unlock event details
            return res.status(200).json({ message: 'Unlock event retrieved successfully', unlockEvent: unlockEvent });

            // Handle errors
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                message: 'Error retrieving unlock event',
                error: err.message
            });
        }
    },


    // Create a new unlock event (admin only)
    createUnlockEvent: async function (req, res) {
        const { userId, boxId } = req.body;

        try {
            // Retrieve the user and box from the database
            const user = await UserModel.findById(userId);
            const box = await BoxModel.findById(boxId);

            // Handle case where user or box is not found
            if (!user || !box) {
                return res.status(404).json({ message: 'User or Box not found' });
            }

            // Create a new unlock event instance
            const unlockEvent = new UnlockEventModel({
                user: userId,
                box: boxId,
            });

            // Save the new unlock event to the database
            const savedUnlockEvent = await unlockEvent.save();

            // Respond with success message
            return res.status(201).json({ message: 'Unlock event created successfully', unlockEvent: savedUnlockEvent });

            // Handle errors
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error creating unlock event', error: err.message });
        }
    },


    // Update an existing unlock event (admin only)
    updateUnlockEvent: async function (req, res) {
        const id = req.params.id;

        try {
            // Retrieve the unlock event from the database
            const unlockEvent = await UnlockEventModel.findOne({ _id: id });

            // Handle case where unlock event is not found
            if (!unlockEvent) {
                return res.status(404).json({ message: 'Unlock event not found' });
            }

            // Define the allowed updates
            const updates = {};
            if (req.body.user) updates.user = req.body.user;
            if (req.body.box) updates.box = req.body.box;

            // Apply the updates to the unlock event object
            Object.assign(unlockEvent, updates);

            // Save the updated unlock event to the database
            const updatedUnlockEvent = await unlockEvent.save();

            // Respond with success message
            return res.status(200).json({ message: 'Unlock event updated successfully', unlockEvent: updatedUnlockEvent });

            // Handle errors
        } catch (err) {
            console.error(err);
            if (err.name === 'ValidationError') {
                const errors = Object.values(err.errors).map(el => el.message);
                return res.status(400).json({ message: 'Validation error', errors: errors });
            }
            return res.status(500).json({ message: 'Error updating unlock event', error: err.message });
        }
    },


    // Remove an existing unlock event (admin only)
    removeUnlockEvent: async function (req, res) {
        const id = req.params.id;

        try {
            // Retrieve the unlock event from the database and delete it
            const unlockEvent = await UnlockEventModel.findByIdAndDelete(id);

            // Handle case where unlock event is not found
            if (!unlockEvent) {
                return res.status(404).json({ message: 'Unlock event not found' });
            }

            // Respond with success message
            return res.status(200).json({ message: 'Unlock event deleted successfully' });

            // Handle errors
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                message: 'Error deleting unlock event',
                error: err.message
            });
        }
    }
};