var BoxModel = require('../models/boxModel.js');
var UserModel = require('../models/userModel.js');

/**
 * boxController.js
 *
 * @description :: Server-side logic for managing boxes.
 */
module.exports = {

    /**
     * boxController.list()
     */
    listBoxes: async function (req, res) {
        try {
            const boxes = await BoxModel.find({});
            return res.status(200).json({ message: 'Boxes retrieved successfully', boxes: boxes });
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                message: 'Error retrieving boxes',
                error: err.message
            });
        }
    },

    /**
     * boxController.show()
     */
    showBoxInfo: async function (req, res) {
        const id = req.params.id;

        try {
            const box = await BoxModel.findOne({_id: id}).populate('authorizedUsers');

            if (!box) {
                return res.status(404).json({
                    message: 'Box not found'
                });
            }

            return res.status(200).json({ message: 'Box retrieved successfully', box: box });
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                message: 'Error retrieving box',
                error: err.message
            });
        }
    },

    assignBox: async function (req, res) {
        const boxId = req.params.id;
        const userId = req.body.userId;

        try {
            const box = await BoxModel.findById(boxId);
            const user = await UserModel.findById(userId);

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

            box.authorizedUsers.push(userId);
            await box.save();

            return res.status(200).json({ message: 'User authorized for box successfully', box: box });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error authorizing user for box', error: err.message });
        }
    },

    authorizeUser: async function (req, res) {
        const userId = req.body.userId;
        const id = req.body.id;
        const boxId = req.body.boxId;

        try {
            let box;

            if (id) {
                // If boxId is provided, use it to find the box
                box = await BoxModel.findById(id);
            } else if (boxId) {
                // If boxId is provided, use it to find the box
                box = await BoxModel.findOne({ boxId: boxId });
            } else {
                return res.status(400).json({ message: 'Box ID or box ID is required' });
            }

            if (!box) {
                return res.status(404).json({ message: 'Box not found' });
            }

            // Check if the user is authorized
            const isAuthorized = box.authorizedUsers.includes(userId);

            return res.status(200).json({ authorized: isAuthorized });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error checking authorization', error: err.message });
        }
    },

    /**
     * boxController.create()
     */
    createBox: async function (req, res) {
        try {
            const box = new BoxModel({
                name: req.body.name,
                location: req.body.location,
                physicalId: req.body.physicalId,
            });

            const savedBox = await box.save();
            return res.status(201).json({ message: 'Box created successfully', box: savedBox });
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

    /**
     * boxController.update()
     */
    updateBox: async function (req, res) {
        const id = req.params.id;

        try {
            const box = await BoxModel.findOne({_id: id});

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

            const updatedBox = await box.save();
            return res.status(200).json({ message: 'Box updated successfully', box: updatedBox });
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

    /**
     * boxController.remove()
     */
    removeBox: async function (req, res) {
        const id = req.params.id;

        try {
            const box = await BoxModel.findByIdAndDelete(id);

            if (!box) {
                return res.status(404).json({ message: 'Box not found' });
            }

            return res.status(200).json({ message: 'Box deleted successfully' });
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                message: 'Error deleting box',
                error: err.message
            });
        }
    },

    showAddForm: async function (req, res) {
        res.render('box/add');
    }
};