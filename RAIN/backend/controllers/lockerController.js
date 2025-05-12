var LockerModel = require('../models/lockerModel.js');

/**
 * lockerController.js
 *
 * @description :: Server-side logic for managing lockers.
 */
module.exports = {

    /**
     * lockerController.list()
     */
    list: function (req, res) {
        LockerModel.find(function (err, lockers) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when getting locker.',
                    error: err
                });
            }

            return res.json(lockers);
        });
    },

    /**
     * lockerController.show()
     */
    show: function (req, res) {
        var id = req.params.id;

        LockerModel.findOne({_id: id}, function (err, locker) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when getting locker.',
                    error: err
                });
            }

            if (!locker) {
                return res.status(404).json({
                    message: 'No such locker'
                });
            }

            return res.json(locker);
        });
    },

    /**
     * lockerController.create()
     */
    create: function (req, res) {
        var locker = new LockerModel({
			name : req.body.name,
			location : req.body.location,
			label : req.body.label,
			status : req.body.status,
			createdAt : req.body.createdAt
        });

        locker.save(function (err, locker) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when creating locker',
                    error: err
                });
            }

            return res.status(201).json(locker);
        });
    },

    /**
     * lockerController.update()
     */
    update: function (req, res) {
        var id = req.params.id;

        LockerModel.findOne({_id: id}, function (err, locker) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when getting locker',
                    error: err
                });
            }

            if (!locker) {
                return res.status(404).json({
                    message: 'No such locker'
                });
            }

            locker.name = req.body.name ? req.body.name : locker.name;
			locker.location = req.body.location ? req.body.location : locker.location;
			locker.label = req.body.label ? req.body.label : locker.label;
			locker.status = req.body.status ? req.body.status : locker.status;
			locker.createdAt = req.body.createdAt ? req.body.createdAt : locker.createdAt;
			
            locker.save(function (err, locker) {
                if (err) {
                    return res.status(500).json({
                        message: 'Error when updating locker.',
                        error: err
                    });
                }

                return res.json(locker);
            });
        });
    },

    /**
     * lockerController.remove()
     */
    remove: function (req, res) {
        var id = req.params.id;

        LockerModel.findByIdAndRemove(id, function (err, locker) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when deleting the locker.',
                    error: err
                });
            }

            return res.status(204).json();
        });
    }
};
