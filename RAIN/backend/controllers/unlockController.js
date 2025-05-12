var UnlockModel = require('../models/unlockModel.js');

/**
 * unlockController.js
 *
 * @description :: Server-side logic for managing unlocks.
 */
module.exports = {

    /**
     * unlockController.list()
     */
    list: function (req, res) {
        UnlockModel.find(function (err, unlocks) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when getting unlock.',
                    error: err
                });
            }

            return res.json(unlocks);
        });
    },

    /**
     * unlockController.show()
     */
    show: function (req, res) {
        var id = req.params.id;

        UnlockModel.findOne({_id: id}, function (err, unlock) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when getting unlock.',
                    error: err
                });
            }

            if (!unlock) {
                return res.status(404).json({
                    message: 'No such unlock'
                });
            }

            return res.json(unlock);
        });
    },

    /**
     * unlockController.create()
     */
    create: function (req, res) {
        var unlock = new UnlockModel({
			user : req.body.user,
			locker : req.body.locker,
			timestamp : req.body.timestamp
        });

        unlock.save(function (err, unlock) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when creating unlock',
                    error: err
                });
            }

            return res.status(201).json(unlock);
        });
    },

    /**
     * unlockController.update()
     */
    update: function (req, res) {
        var id = req.params.id;

        UnlockModel.findOne({_id: id}, function (err, unlock) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when getting unlock',
                    error: err
                });
            }

            if (!unlock) {
                return res.status(404).json({
                    message: 'No such unlock'
                });
            }

            unlock.user = req.body.user ? req.body.user : unlock.user;
			unlock.locker = req.body.locker ? req.body.locker : unlock.locker;
			unlock.timestamp = req.body.timestamp ? req.body.timestamp : unlock.timestamp;
			
            unlock.save(function (err, unlock) {
                if (err) {
                    return res.status(500).json({
                        message: 'Error when updating unlock.',
                        error: err
                    });
                }

                return res.json(unlock);
            });
        });
    },

    /**
     * unlockController.remove()
     */
    remove: function (req, res) {
        var id = req.params.id;

        UnlockModel.findByIdAndRemove(id, function (err, unlock) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when deleting the unlock.',
                    error: err
                });
            }

            return res.status(204).json();
        });
    }
};
