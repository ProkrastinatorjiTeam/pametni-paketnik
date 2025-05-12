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
     * unlockController.list()
     */
    list: async function (req, res) {
        try {
            const unlocks = await UnlockModel.find({});
            return res.json(unlocks);
        } catch (err) {
            return res.status(500).json({
                message: 'Error when getting unlocks.',
                error: err
            });
        }
    },

    /**
     * unlockController.show()
     */
    show: async function (req, res) {
        const id = req.params.id;

        try {
            const unlock = await UnlockModel.findOne({_id: id});

            if (!unlock) {
                return res.status(404).json({
                    message: 'No such unlock'
                });
            }

            return res.json(unlock);
        } catch (err) {
            return res.status(500).json({
                message: 'Error when getting unlock.',
                error: err
            });
        }
    },

    /**
     * unlockController.create()
     */
    create: async function (req, res) {
        const unlock = new UnlockModel({
            user: req.body.user,
            locker: req.body.locker,
            timestamp: req.body.timestamp
        });

        try {
            const savedUnlock = await unlock.save();
            return res.status(201).json(savedUnlock);
        } catch (err) {
            return res.status(500).json({
                message: 'Error when creating unlock',
                error: err
            });
        }
    },

    /**
     * unlockController.update()
     */
    update: async function (req, res) {
        const id = req.params.id;

        try {
            const unlock = await UnlockModel.findOne({_id: id});

            if (!unlock) {
                return res.status(404).json({
                    message: 'No such unlock'
                });
            }

            unlock.user = req.body.user ? req.body.user : unlock.user;
            unlock.locker = req.body.locker ? req.body.locker : unlock.locker;
            unlock.timestamp = req.body.timestamp ? req.body.timestamp : unlock.timestamp;

            const updatedUnlock = await unlock.save();
            return res.json(updatedUnlock);
        } catch (err) {
            return res.status(500).json({
                message: 'Error when updating unlock.',
                error: err
            });
        }
    },

    /**
     * unlockController.remove()
     */
    remove: async function (req, res) {
        const id = req.params.id;

        try {
            await UnlockModel.findByIdAndRemove(id);
            return res.status(204).json();
        } catch (err) {
            return res.status(500).json({
                message: 'Error when deleting the unlock.',
                error: err
            });
        }
    },

    createUnlock: async function (req, res) {
        const { userId, lockerId } = req.body;

        try {
            console.log(userId + "  " + lockerId);
            const user = await UserModel.findById(userId);
            const locker = await LockerModel.findById(lockerId);

            if (!user || !locker) {
                return res.status(404).json({ message: 'User or Locker not found.' });
            }

            if (!locker.status) {
                return res.status(400).json({ message: 'Locker is not available for unlocking.' });
            }

            const unlock = new UnlockModel({
                user: userId,
                locker: lockerId,
                timestamp: new Date(),
            });

            await unlock.save();

            locker.status = false;
            await locker.save();

            res.status(201).json({ message: 'Unlock recorded successfully', unlock });
        } catch (error) {
            res.status(500).json({ message: 'Internal server error' });
        }
    }
};
