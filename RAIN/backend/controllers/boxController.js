var BoxModel = require('../models/boxModel.js');
var UserModel = require('../models/userModel.js');
var UnlockEventModel = require('../models/unlockEventModel.js'); // Added this line


module.exports = {

    // List all boxes (admin only)
    listBoxes: async function (req, res) {
        try {
            // Fetch all boxes from the database
            const boxes = await BoxModel.find({});

            // Respond with the list of boxes
            return res.status(200).json({message: 'Boxes retrieved successfully', boxes: boxes});

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
            const box = await BoxModel.findOne({_id: id}).populate('authorizedUsers');

            // Handle case where box is not found
            if (!box) {
                return res.status(404).json({
                    message: 'Box not found'
                });
            }

            // Respond with the box details
            return res.status(200).json({message: 'Box retrieved successfully', box: box});

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
                return res.status(404).json({message: 'Box not found'});
            }

            // Retrieve the user from the database
            const user = await UserModel.findById(userId);

            // Handle case where user is not found
            if (!user) {
                return res.status(404).json({message: 'User not found'});
            }

            // Check if the user is an admin or is authorized for the box
            if (user.role !== 'admin' && !box.authorizedUsers.includes(userId)) {
                return res.status(403).json({message: 'You are not authorized to view this box\'s unlock history'});
            }

            // Retrieve the unlock events for the box from the database
            const unlockEvents = await UnlockEventModel.find({box: boxId});

            // Respond with the list of unlock events
            return res.status(200).json({
                message: 'Box unlock history retrieved successfully',
                unlockEvents: unlockEvents
            });

            // Handle errors
        } catch (err) {
            console.error(err);
            return res.status(500).json({message: 'Error retrieving box unlock history', error: err.message});
        }
    },


    // Add a new box
    addBox: async function (req, res) {
        try {
            // Check if the box already exists
            const existingBox = await BoxModel.findOne({physicalId: parseInt(req.body.physicalId)});

            // Handle case where box already exists
            if (existingBox) {
                return res.status(400).json({message: 'Box with this physical ID already exists'});
            }

            // Get the user ID from the session
            const userId = req.session.userId;

            // Create a new box instance
            const box = new BoxModel({
                name: req.body.name,
                location: req.body.location,
                physicalId: parseInt(req.body.physicalId),
                authorizedUsers: [userId]
            });

            // Save the new box to the database
            const savedBox = await box.save();

            // Respond with success message
            return res.status(201).json({message: 'Box added successfully', box: savedBox});

            // Handle errors
        } catch (err) {
            console.error(err);
            if (err.name === 'ValidationError') {
                // Mongoose validation error
                const errors = Object.values(err.errors).map(el => el.message);
                return res.status(400).json({message: 'Validation error', errors: errors});
            }
            return res.status(500).json({
                message: 'Error adding box',
                error: err.message
            });
        }
    },


    // Request to unlock a box
    requestBoxUnlock: async function (req, res) {
        const {physicalId} = req.body;
        const userId = req.session.userId;

        try {
            let box;
            // Try to find the box by physicalId
            if (physicalId) {
                box = await BoxModel.findOne({physicalId: parseInt(physicalId)});
            }

            if (!box) {
                return res.status(404).json({message: 'Box not found'});
            }

            const user = await UserModel.findById(userId);

            // Handle case where box or user is not found
            if (!box) {
                return res.status(404).json({message: 'Box not found'});
            }

            if (!user) {
                return res.status(404).json({message: 'User not found'});
            }

            let unlockEvent;
            let successful = false;
            // Check if the user is authorized
            if (box.authorizedUsers.includes(userId)) {
                successful = true;
            }

            unlockEvent = new UnlockEventModel({
                user: userId,
                box: box._id,
                authorized: successful
            });
            await unlockEvent.save();

            if (!successful) {
                return res.status(403).json({message: 'User is not authorized to unlock this box'});
            }

            // Respond with success message
            return res.status(200).json({message: 'Box unlock requested successfully'});

            // Handle errors
        } catch (err) {
            console.error(err);
            return res.status(500).json({message: 'Error requesting box unlock', error: err.message});
        }
    },


    // Authorize a user for a box (admin or authorized user only)
    authorizeBox: async function (req, res) {
        const boxId = req.params.id;
        const userId = req.body.userId;

        try {
            // Retrieve the box from the database
            const box = await BoxModel.findById(boxId);

            // Handle case where box is not found
            if (!box) {
                return res.status(404).json({message: 'Box not found'});
            }

            // Get the user ID from the session
            const currentUserId = req.session.userId;

            // Retrieve the user from the database
            const currentUser = await UserModel.findById(currentUserId);

            // Handle case where user is not found
            if (!currentUser) {
                return res.status(404).json({message: 'User not found'});
            }

            // Check if the current user is an admin or is authorized for the box
            if (currentUser.role !== 'admin' && !box.authorizedUsers.includes(currentUserId)) {
                return res.status(403).json({message: 'You are not authorized to authorize users for this box'});
            }

            // Retrieve the user to be authorized from the database
            const user = await UserModel.findById(userId);

            // Handle case where user is not found
            if (!user) {
                return res.status(404).json({message: 'User not found'});
            }

            // Check if the user is already authorized
            if (box.authorizedUsers.includes(userId)) {
                return res.status(400).json({message: 'User is already authorized for this box'});
            }

            // Add the user to the authorized users list
            box.authorizedUsers.push(userId);
            await box.save();

            // Respond with success message
            return res.status(200).json({message: 'User authorized for box successfully', box: box});

            // Handle errors
        } catch (err) {
            console.error(err);
            return res.status(500).json({message: 'Error authorizing user for box', error: err.message});
        }
    },


    // Update an existing box
    updateBox: async function (req, res) {
        const id = req.params.id;

        try {
            // Retrieve the box from the database
            const box = await BoxModel.findById(id);

            // Handle case where box is not found
            if (!box) {
                return res.status(404).json({message: 'Box not found'});
            }

            // Get the user ID from the session
            const currentUserId = req.session.userId;

            // Retrieve the user from the database
            const currentUser = await UserModel.findById(currentUserId);

            // Handle case where user is not found
            if (!currentUser) {
                return res.status(404).json({message: 'User not found'});
            }

            // Check if the current user is an admin or is authorized for the box
            if (currentUser.role !== 'admin' && !box.authorizedUsers.includes(currentUserId)) {
                return res.status(403).json({message: 'You are not authorized to update this box'});
            }

            // Validate input data
            const updates = {};
            if (req.body.name) updates.name = req.body.name;
            if (req.body.location) updates.location = req.body.location;
            if (req.body.physicalId) updates.physicalId = parseInt(req.body.physicalId);

            // Update box data
            Object.assign(box, updates);

            // Save the updated box to the database
            const updatedBox = await box.save();

            // Respond with success message
            return res.status(200).json({message: 'Box updated successfully', box: updatedBox});

            // Handle errors
        } catch (err) {
            console.error(err);
            if (err.name === 'ValidationError') {
                // Mongoose validation error
                const errors = Object.values(err.errors).map(el => el.message);
                return res.status(400).json({message: 'Validation error', errors: errors});
            }
            return res.status(500).json({message: 'Error updating box', error: err.message});
        }
    },


    // Remove an existing box
    removeBox: async function (req, res) {
        const id = req.params.id;

        try {
            // Retrieve the box from the database
            const box = await BoxModel.findById(id);

            // Handle case where box is not found
            if (!box) {
                return res.status(404).json({message: 'Box not found'});
            }

            // Get the user ID from the session
            const currentUserId = req.session.userId;

            // Retrieve the user from the database
            const currentUser = await UserModel.findById(currentUserId);

            // Handle case where user is not found
            if (!currentUser) {
                return res.status(404).json({message: 'User not found'});
            }

            // Check if the current user is an admin or is authorized for the box
            if (currentUser.role !== 'admin' && !box.authorizedUsers.includes(currentUserId)) {
                return res.status(403).json({message: 'You are not authorized to remove this box'});
            }

            // Retrieve the box from the database and delete it
            const deletedBox = await BoxModel.findByIdAndDelete(id);

            // Respond with success message
            return res.status(200).json({message: 'Box deleted successfully'});

            // Handle errors
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                message: 'Error deleting box',
                error: err.message
            });
        }
    },

    checkAccess: async function (req, res) {
        try {
            let physicalId = req.body.physicalId;
            const userId = req.user._id;

            if (!physicalId) {
                return res.status(400).json({message: 'Missing physicalId'});
            }

            const box = await BoxModel.findOne({physicalId: physicalId});
            if (!box) {
                return res.status(404).json({message: 'Box not found'});
            }

            const isAuthorized = box.authorizedUsers.some(id => id.equals(userId));

            if (!isAuthorized) {
                return res.status(403).json({message: 'You are not authorized to open this box.'});
            }

            res.json({success: true, boxId: box._id});
        } catch (err) {
            console.error('check-access error:', err);
            res.status(500).json({message: 'Server error'});
        }
    }
};