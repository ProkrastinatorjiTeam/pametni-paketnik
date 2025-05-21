var UnlockModel = require('../models/unlockModel.js');
var UserModel = require('../models/userModel.js');
var LockerModel = require('../models/lockerModel.js');

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
            const unlocks = await UnlockModel.find({ user: userId }).populate('locker'); // Find unlocks for the user and populate locker info

            return res.status(200).json({ message: 'Unlock history retrieved successfully', unlocks: unlocks });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error retrieving unlock history', error: err.message });
        }
    },

    userUnlockHistory: async function (req, res) {
        const userId = req.params.id; // Get user ID from parameters

        try {
            const unlocks = await UnlockModel.find({ user: userId }).populate('locker'); // Find unlocks for the user and populate locker info

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

    /**
     * unlockController.createUnlock()
     * Creates a new unlock and updates the locker status.
     */
    addUnlock: async function (req, res) {
        const { userId, lockerId } = req.body;

        try {
            const user = await UserModel.findById(userId);
            const locker = await LockerModel.findById(lockerId);

            if (!user || !locker) {
                return res.status(404).json({ message: 'User or Locker not found' });
            }

            // **Authorization Check (Critical)**
            if (!locker.allowedToOpen.includes(userId)) {
                return res.status(403).json({ message: 'User is not authorized to unlock this locker' });
            }

            // **Race Condition Prevention and Atomic Operation**
            const session = await mongoose.startSession();
            session.startTransaction();

            try {
                // Attempt to find and update the locker in a single atomic operation
                const updatedLocker = await LockerModel.findOneAndUpdate(
                    { _id: lockerId, status: true }, // Find locker only if status is true
                    { status: false }, // Set status to false
                    { new: true, session } // Options: return updated doc and use transaction
                );

                if (!updatedLocker) {
                    // If findOneAndUpdate returns null, it means the locker was already unlocked
                    await session.abortTransaction();
                    session.endSession();
                    return res.status(400).json({ message: 'Locker is not available for unlocking' });
                }

                const unlock = new UnlockModel({
                    user: userId,
                    locker: lockerId,
                });

                await unlock.save({ session }); // Save unlock within the transaction

                await session.commitTransaction();
                session.endSession();

                return res.status(201).json({ message: 'Unlock recorded successfully', unlock: unlock });
            } catch (err) {
                await session.abortTransaction();
                session.endSession();
                throw err; // Re-throw the error to be caught by the outer catch
            }
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error recording unlock', error: err.message });
        }
    }
};