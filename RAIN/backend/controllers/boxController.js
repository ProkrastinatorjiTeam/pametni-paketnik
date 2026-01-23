var BoxModel = require('../models/boxModel.js');
var UserModel = require('../models/userModel.js');
var UnlockEventModel = require('../models/unlockEventModel.js');
var OrderModel = require('../models/orderModel.js');

const ACTIVE_ORDER_STATUSES = ['pending', 'reserved', 'ready for pickup'];

module.exports = {

    // List all boxes
    listBoxes: async function (req, res) {
        try {
            const boxes = await BoxModel.find({}).lean();

            const boxesWithStatus = await Promise.all(boxes.map(async (box) => {
                // POPRAVEK: Uporabimo konstanto za vse aktivne statuse
                const activeOrderCount = await OrderModel.countDocuments({
                    box: box._id,
                    status: { $in: ACTIVE_ORDER_STATUSES }
                });

                return {
                    ...box,
                    isBusy: activeOrderCount > 0
                };
            }));

            return res.status(200).json({
                message: 'Boxes retrieved successfully',
                boxes: boxesWithStatus
            });

        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error retrieving boxes', error: err.message });
        }
    },


    showBox: async function (req, res) {
        const id = req.params.id;

        try {
            const box = await BoxModel.findById(id).populate('authorizedUsers').lean();

            if (!box) {
                return res.status(404).json({ message: 'Box not found' });
            }

            const activeOrderCount = await OrderModel.countDocuments({
                box: box._id,
                status: { $in: ACTIVE_ORDER_STATUSES }
            });

            box.isBusy = activeOrderCount > 0;

            return res.status(200).json({ message: 'Box retrieved successfully', box: box });

        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error retrieving box', error: err.message });
        }
    },


    // Get box unlock history
    getBoxUnlockHistory: async function (req, res) {
        const boxId = req.params.id;
        const userId = req.session.userId;

        try {
            const box = await BoxModel.findById(boxId);
            if (!box) return res.status(404).json({message: 'Box not found'});

            const user = await UserModel.findById(userId);
            if (!user) return res.status(404).json({message: 'User not found'});

            if (user.role !== 'admin') {
                return res.status(403).json({message: 'You are not authorized to view this box\'s unlock history'});
            }

            const unlockEvents = await UnlockEventModel.find({box: boxId})
                .populate('user', 'username')
                .sort({createdAt: -1});

            return res.status(200).json({
                message: 'Box unlock history retrieved successfully',
                unlockEvents: unlockEvents
            });

        } catch (err) {
            console.error('Error retrieving box unlock history:', err);
            return res.status(500).json({message: 'Error retrieving box unlock history', error: err.message});
        }
    },


    // Add a new box
    addBox: async function (req, res) {
        try {
            const existingBox = await BoxModel.findOne({physicalId: parseInt(req.body.physicalId)});

            if (existingBox) {
                return res.status(400).json({message: 'Box with this physical ID already exists'});
            }

            const box = new BoxModel({
                name: req.body.name,
                location: req.body.location,
                physicalId: parseInt(req.body.physicalId),
                authorizedUsers: []
            });

            const savedBox = await box.save();
            return res.status(201).json({message: 'Box added successfully', box: savedBox});

        } catch (err) {
            console.error(err);
            if (err.name === 'ValidationError') {
                const errors = Object.values(err.errors).map(el => el.message);
                return res.status(400).json({message: 'Validation error', errors: errors});
            }
            return res.status(500).json({ message: 'Error adding box', error: err.message });
        }
    },


    // Request to unlock a box (User triggers this from App)
    requestBoxUnlock: async function (req, res) {
        const {physicalId} = req.body;
        const userId = req.session.userId;

        try {
            let box;
            if (physicalId) {
                box = await BoxModel.findOne({physicalId: parseInt(physicalId)});
            }

            if (!box) {
                return res.status(404).json({message: 'Box not found'});
            }

            const user = await UserModel.findById(userId);
            if (!user) {
                return res.status(404).json({message: 'User not found'});
            }

            let successful = false;
            // Preveri string ID-je
            if (box.authorizedUsers.map(id => id.toString()).includes(userId.toString())) {
                successful = true;
            }

            const unlockEvent = new UnlockEventModel({
                user: userId,
                box: box._id,
                authorized: successful
            });
            await unlockEvent.save();

            if (!successful) {
                return res.status(403).json({message: 'User is not authorized to unlock this box'});
            }


            return res.status(200).json({message: 'Box unlock requested successfully'});

        } catch (err) {
            console.error(err);
            return res.status(500).json({message: 'Error requesting box unlock', error: err.message});
        }
    },


    // Authorize a user for a box
    authorizeBox: async function (req, res) {
        const boxId = req.params.id;
        const userIdToAuthorize = req.body.userId;

        try {
            const box = await BoxModel.findById(boxId);
            if (!box) return res.status(404).json({message: 'Box not found'});

            const currentUserId = req.session.userId;
            const currentUser = await UserModel.findById(currentUserId);

            if (!currentUser || currentUser.role !== 'admin') {
                return res.status(403).json({message: 'You are not authorized to authorize users for this box'});
            }

            const userToAuthorizeDetails = await UserModel.findById(userIdToAuthorize);
            if (!userToAuthorizeDetails) {
                return res.status(404).json({message: 'User to be authorized not found'});
            }

            if (box.authorizedUsers.map(id => id.toString()).includes(userIdToAuthorize.toString())) {
                return res.status(400).json({message: 'User is already authorized for this box'});
            }

            box.authorizedUsers.push(userIdToAuthorize);
            await box.save();

            const populatedBox = await BoxModel.findById(boxId).populate('authorizedUsers', 'username email');
            return res.status(200).json({message: 'User authorized for box successfully', box: populatedBox});

        } catch (err) {
            console.error(err);
            return res.status(500).json({message: 'Error authorizing user for box', error: err.message});
        }
    },


    // Update an existing box
    updateBox: async function (req, res) {
        const id = req.params.id;

        try {
            const box = await BoxModel.findById(id);
            if (!box) return res.status(404).json({message: 'Box not found'});

            const currentUserId = req.session.userId;
            const currentUser = await UserModel.findById(currentUserId);

            if (!currentUser || currentUser.role !== 'admin') {
                return res.status(403).json({message: 'You are not authorized to update this box'});
            }

            const updates = {};
            if (req.body.name !== undefined) updates.name = req.body.name;
            if (req.body.location !== undefined) updates.location = req.body.location;
            if (req.body.physicalId !== undefined) {
                const newPhysicalId = parseInt(req.body.physicalId);
                if (isNaN(newPhysicalId)) {
                    return res.status(400).json({message: 'Physical ID must be a number.'});
                }
                const existingBoxWithPhysicalId = await BoxModel.findOne({ physicalId: newPhysicalId, _id: { $ne: id } });
                if (existingBoxWithPhysicalId) {
                    return res.status(400).json({ message: 'Another box with this physical ID already exists.' });
                }
                updates.physicalId = newPhysicalId;
            }

            Object.assign(box, updates);
            const updatedBox = await box.save();
            const populatedBox = await BoxModel.findById(updatedBox._id).populate('authorizedUsers', 'username email');

            return res.status(200).json({message: 'Box updated successfully', box: populatedBox});

        } catch (err) {
            console.error(err);
            if (err.name === 'ValidationError') {
                const errors = Object.values(err.errors).map(el => el.message);
                return res.status(400).json({message: 'Validation error', errors: errors});
            }
            return res.status(500).json({message: 'Error updating box', error: err.message});
        }
    },


    removeBox: async function (req, res) {
        const id = req.params.id;

        try {
            const box = await BoxModel.findById(id);
            if (!box) return res.status(404).json({message: 'Box not found'});

            const currentUserId = req.session.userId;
            const currentUser = await UserModel.findById(currentUserId);

            if (!currentUser || currentUser.role !== 'admin') {
                return res.status(403).json({message: 'You are not authorized to remove this box'});
            }

            const activeOrderCount = await OrderModel.countDocuments({
                box: id,
                status: { $in: ACTIVE_ORDER_STATUSES }
            });

            if (activeOrderCount > 0) {
                return res.status(400).json({ message: 'Cannot remove box. It is currently in use by an active order.' });
            }

            await BoxModel.findByIdAndDelete(id);
            return res.status(200).json({message: 'Box deleted successfully'});

        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error deleting box', error: err.message });
        }
    },

    checkAccess: async function (req, res) {
        try {
            let physicalId = req.body.physicalId;

            const userId = req.user ? req.user._id : req.session.userId;

            if (!userId) {
                return res.status(401).json({message: 'Unauthorized'});
            }

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

            const order = await OrderModel.findOne({
                box: box._id,
                orderBy: userId,
                status: { $in: ['ready for pickup', 'ready for pickup'] }
            });

            if (order) {
                order.status = 'done';
                await order.save();

                box.authorizedUsers = box.authorizedUsers.filter(id => !id.equals(userId));
                await box.save();
            }

            res.json({success: true, boxId: box._id});
        } catch (err) {
            console.error('check-access error:', err);
            res.status(500).json({message: 'Server error'});
        }
    }
};