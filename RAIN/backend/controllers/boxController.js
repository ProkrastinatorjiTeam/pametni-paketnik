var BoxModel = require('../models/boxModel.js');
var UserModel = require('../models/userModel.js');
var UnlockEventModel = require('../models/unlockEventModel.js'); // Added this line

/**
 * boxController.js
 *
 * @description :: Server-side logic for managing boxes.
 */
module.exports = {

    // List all boxes (admin only)
    listBoxes: async function (req, res) {
        try {
            // Fetch all boxes from the database
            const boxes = await BoxModel.find({});

            // Respond with the list of boxes
            return res.status(200).json({ message: 'Boxes retrieved successfully', boxes: boxes });

            // Handle errors
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                message: 'Error retrieving boxes',
                error: err.message
            });
        }
    },


    // Show details for a specific box
    showBox: async function (req, res) {
        const id = req.params.id;

        try {
            // Retrieve the box from the database
            const box = await BoxModel.findOne({ _id: id }).populate('authorizedUsers');

            // Handle case where box is not found
            if (!box) {
                return res.status(404).json({
                    message: 'Box not found'
                });
            }

            // Respond with the box details
            return res.status(200).json({ message: 'Box retrieved successfully', box: box });

            // Handle errors
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                message: 'Error retrieving box',
                error: err.message
            });
        }
    },


    // Get box unlock history
    getBoxUnlockHistory: async function (req, res) {
        const boxId = req.params.id;
        const userId = req.session.userId;

        try {
            // Retrieve the box from the database
            const box = await BoxModel.findById(boxId);

            // Handle case where box is not found
            if (!box) {
                return res.status(404).json({ message: 'Box not found' });
            }

            // Retrieve the user from the database
            const user = await UserModel.findById(userId);

            // Handle case where user is not found
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Check if the user is an admin or is authorized for the box
            if (user.role !== 'admin' && !box.authorizedUsers.includes(userId)) {
                return res.status(403).json({ message: 'You are not authorized to view this box\'s unlock history' });
            }

            // Retrieve the unlock events for the box from the database
            const unlockEvents = await UnlockEventModel.find({ box: boxId });

            // Respond with the list of unlock events
            return res.status(200).json({ message: 'Box unlock history retrieved successfully', unlockEvents: unlockEvents });

            // Handle errors
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error retrieving box unlock history', error: err.message });
        }
    },


    // Create a new box (admin only)
    createBox: async function (req, res) {
        try {
            // Create a new box instance
            const box = new BoxModel({
                name: req.body.name,
                location: req.body.location,
                physicalId: req.body.physicalId,
            });

            // Save the new box to the database
            const savedBox = await box.save();

            // Respond with success message
            return res.status(201).json({ message: 'Box created successfully', box: savedBox });

            // Handle errors
        } catch (err) {
            console.error(err);
            if (err.name === 'ValidationError') {
                // Mongoose validation error
                const errors = Object.values(err.errors).map(el => el.message);
                return res.status(400).json({ message: 'Validation error', errors: errors });
            }
            return res.status(500).json({
                message: 'Error creating box',
                error: err.message
            });
        }
    },


    // Request to unlock a box
    requestBoxUnlock: async function (req, res) {
        const { userId, boxId } = req.body;

        try {
            // Retrieve the box and user from the database
            const box = await BoxModel.findOne({ physicalId: boxId });
            const user = await UserModel.findById(userId);

            // Handle case where box or user is not found
            if (!box) {
                return res.status(404).json({ message: 'Box not found' });
            }

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Check if the user is authorized
            if (!box.authorizedUsers.includes(userId)) {
                // Create a new unlock event with authorized = false
                const unlockEvent = new UnlockEventModel({
                    user: userId,
                    box: box._id,
                    successful: false
                });
                await unlockEvent.save();

                return res.status(403).json({ message: 'User is not authorized to unlock this box' });
            }

            // Create a new unlock event with authorized = true
            const unlockEvent = new UnlockEventModel({
                user: userId,
                box: box._id,
                successful: true
            });
            await unlockEvent.save();

            // Respond with success message
            return res.status(200).json({ message: 'Box unlock requested successfully' });

            // Handle errors
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error requesting box unlock', error: err.message });
        }
    },


    // Assign a box to a user (admin only)
    assignBox: async function (req, res) {
        const boxId = req.params.id;
        const userId = req.body.userId;

        try {
            // Retrieve the box and user from the database
            const box = await BoxModel.findById(boxId);
            const user = await UserModel.findById(userId);

            // Handle case where box or user is not found
            if (!box) {
                return res.status(404).json({ message: 'Box not found' });
            }

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Check if the user is already authorized
            if (box.authorizedUsers.includes(userId)) {
                return res.status(400).json({ message: 'User is already authorized for this box' });
            }

            // Add the user to the authorized users list
            box.authorizedUsers.push(userId);
            await box.save();

            // Respond with success message
            return res.status(200).json({ message: 'User authorized for box successfully', box: box });

            // Handle errors
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error authorizing user for box', error: err.message });
        }
    },


    // Update an existing box (admin only)
    updateBox: async function (req, res) {
        const id = req.params.id;

        try {
            // Retrieve the box from the database
            const box = await BoxModel.findOne({ _id: id });

            // Handle case where box is not found
            if (!box) {
                return res.status(404).json({ message: 'Box not found' });
            }

            // Validate input data
            const updates = {};
            if (req.body.name) updates.name = req.body.name;
            if (req.body.location) updates.location = req.body.location;
            if (req.body.physicalId) updates.physicalId = req.body.physicalId;

            // Update box data
            Object.assign(box, updates);

            // Save the updated box to the database
            const updatedBox = await box.save();

            // Respond with success message
            return res.status(200).json({ message: 'Box updated successfully', box: updatedBox });

            // Handle errors
        } catch (err) {
            console.error(err);
            if (err.name === 'ValidationError') {
                // Mongoose validation error
                const errors = Object.values(err.errors).map(el => el.message);
                return res.status(400).json({ message: 'Validation error', errors: errors });
            }
            return res.status(500).json({ message: 'Error updating box', error: err.message });
        }
    },

    
    // Remove an existing box (admin only)
    removeBox: async function (req, res) {
        const id = req.params.id;

        try {
            // Retrieve the box from the database and delete it
            const box = await BoxModel.findByIdAndDelete(id);

            // Handle case where box is not found
            if (!box) {
                return res.status(404).json({ message: 'Box not found' });
            }

            // Respond with success message
            return res.status(200).json({ message: 'Box deleted successfully' });

            // Handle errors
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                message: 'Error deleting box',
                error: err.message
            });
        }
    }
};