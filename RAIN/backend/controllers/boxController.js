var BoxModel = require('../models/boxModel.js');
var UserModel = require('../models/userModel.js');
var UnlockEventModel = require('../models/unlockEventModel.js');
var OrderModel = require('../models/orderModel.js'); // Add OrderModel


module.exports = {

    // List all boxes
    listBoxes: async function (req, res) {
        try {
            // Fetch all boxes from the database
            const boxes = await BoxModel.find({}).lean(); // Use .lean() for plain JS objects

            // For each box, check if it's currently used in an active "printing" order
            const boxesWithStatus = await Promise.all(boxes.map(async (box) => {
                const activeOrderCount = await OrderModel.countDocuments({
                    box: box._id,
                    status: 'printing'
                });
                return {
                    ...box,
                    isBusy: activeOrderCount > 0
                };
            }));

            // Respond with the list of boxes including their busy status
            return res.status(200).json({message: 'Boxes retrieved successfully', boxes: boxesWithStatus});

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
            const box = await BoxModel.findById(id).populate('authorizedUsers').lean();

            // Handle case where box is not found
            if (!box) {
                return res.status(404).json({
                    message: 'Box not found'
                });
            }

            // Check if the box is currently used in an active "printing" order
            const activeOrderCount = await OrderModel.countDocuments({
                box: box._id,
                status: 'printing'
            });
            box.isBusy = activeOrderCount > 0;

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
            // For admin panel, typically only admin should see full history.
            if (user.role !== 'admin') {
                return res.status(403).json({message: 'You are not authorized to view this box\'s unlock history'});
            }

            // Retrieve the unlock events for the box from the database
            const unlockEvents = await UnlockEventModel.find({box: boxId})
                                                .populate('user', 'username') // Populate username
                                                .sort({createdAt: -1}); // Sort by most recent

            // Respond with the list of unlock events
            return res.status(200).json({
                message: 'Box unlock history retrieved successfully',
                unlockEvents: unlockEvents
            });

            // Handle errors
        } catch (err) {
            console.error('Error retrieving box unlock history:', err);
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

            // Get the user ID from the session - assuming admin adds boxes
            const userId = req.session.userId; 
            const user = await UserModel.findById(userId);

            if (!user || user.role !== 'admin') {
                 // If not admin, check if this route should even be accessible
                 // For now, let's assume only admin adds boxes, so this check is more for robustness
                 // Or, if any authenticated user can add, then authorizedUsers might be just [userId]
                // return res.status(403).json({message: 'Only admins can add boxes.'});
            }


            // Create a new box instance
            const box = new BoxModel({
                name: req.body.name,
                location: req.body.location,
                physicalId: parseInt(req.body.physicalId),
                // When a new box is added, it's not initially tied to any user for authorization
                // unless the admin adding it should be auto-authorized.
                // For simplicity, let's keep authorizedUsers empty or add the admin if desired.
                // authorizedUsers: user.role === 'admin' ? [userId] : [] 
                authorizedUsers: [] // Or [userId] if admin should be auto-authorized
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
            if (!box) { // Redundant check, but safe
                return res.status(404).json({message: 'Box not found'});
            }

            if (!user) {
                return res.status(404).json({message: 'User not found'});
            }

            let unlockEvent;
            let successful = false;
            // Check if the user is authorized
            if (box.authorizedUsers.map(id => id.toString()).includes(userId.toString())) {
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
        const userIdToAuthorize = req.body.userId; // The user to be authorized

        try {
            // Retrieve the box from the database
            const box = await BoxModel.findById(boxId);

            // Handle case where box is not found
            if (!box) {
                return res.status(404).json({message: 'Box not found'});
            }

            // Get the current user ID from the session (the one performing the action)
            const currentUserId = req.session.userId;
            const currentUser = await UserModel.findById(currentUserId);

            if (!currentUser) {
                return res.status(404).json({message: 'Current user performing action not found'});
            }

            // Check if the current user is an admin
            if (currentUser.role !== 'admin') {
                return res.status(403).json({message: 'You are not authorized to authorize users for this box'});
            }

            // Retrieve the user to be authorized from the database
            const userToAuthorizeDetails = await UserModel.findById(userIdToAuthorize);
            if (!userToAuthorizeDetails) {
                return res.status(404).json({message: 'User to be authorized not found'});
            }


            // Check if the user is already authorized
            if (box.authorizedUsers.map(id => id.toString()).includes(userIdToAuthorize.toString())) {
                return res.status(400).json({message: 'User is already authorized for this box'});
            }

            // Add the user to the authorized users list
            box.authorizedUsers.push(userIdToAuthorize);
            await box.save();

            // Respond with success message
            const populatedBox = await BoxModel.findById(boxId).populate('authorizedUsers', 'username email');
            return res.status(200).json({message: 'User authorized for box successfully', box: populatedBox});

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
            const currentUser = await UserModel.findById(currentUserId);

            if (!currentUser) {
                return res.status(404).json({message: 'User not found'});
            }

            // Check if the current user is an admin
            if (currentUser.role !== 'admin') {
                return res.status(403).json({message: 'You are not authorized to update this box'});
            }

            // Validate input data
            const updates = {};
            if (req.body.name !== undefined) updates.name = req.body.name;
            if (req.body.location !== undefined) updates.location = req.body.location;
            if (req.body.physicalId !== undefined) {
                const newPhysicalId = parseInt(req.body.physicalId);
                if (isNaN(newPhysicalId)) {
                    return res.status(400).json({message: 'Physical ID must be a number.'});
                }
                // Check if another box already has this physicalId
                const existingBoxWithPhysicalId = await BoxModel.findOne({ physicalId: newPhysicalId, _id: { $ne: id } });
                if (existingBoxWithPhysicalId) {
                    return res.status(400).json({ message: 'Another box with this physical ID already exists.' });
                }
                updates.physicalId = newPhysicalId;
            }
            // Note: authorizedUsers should be managed by authorizeBox/deauthorizeBox typically

            // Update box data
            Object.assign(box, updates);
            // Save the updated box to the database
            const updatedBox = await box.save();
            const populatedBox = await BoxModel.findById(updatedBox._id).populate('authorizedUsers', 'username email');


            // Respond with success message
            return res.status(200).json({message: 'Box updated successfully', box: populatedBox});

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
            const currentUser = await UserModel.findById(currentUserId);

            if (!currentUser) {
                return res.status(404).json({message: 'User not found'});
            }

            // Check if the current user is an admin
            if (currentUser.role !== 'admin') {
                return res.status(403).json({message: 'You are not authorized to remove this box'});
            }

            // Check if the box is currently in use by an active order
            const activeOrderCount = await OrderModel.countDocuments({ box: id, status: 'printing' });
            if (activeOrderCount > 0) {
                return res.status(400).json({ message: 'Cannot remove box. It is currently in use by an active print order.' });
            }

            // Retrieve the box from the database and delete it
            await BoxModel.findByIdAndDelete(id);

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
            const userId = req.user._id; // Assuming req.user is populated by auth middleware

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