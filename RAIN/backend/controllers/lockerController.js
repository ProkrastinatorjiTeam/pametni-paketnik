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
    list: async function (req, res) {
        try {
            const lockers = await LockerModel.find({});
            return res.json(lockers);
        } catch (err) {
            return res.status(500).json({
                message: 'Error when getting lockers.',
                error: err
            });
        }
    },

    /**
     * lockerController.show()
     */
    show: async function (req, res) {
        const id = req.params.id;

        try {
            const locker = await LockerModel.findOne({_id: id});

            if (!locker) {
                return res.status(404).json({
                    message: 'No such locker'
                });
            }

            return res.json(locker);
        } catch (err) {
            return res.status(500).json({
                message: 'Error when getting locker.',
                error: err
            });
        }
    },

    /**
     * lockerController.create()
     */
    create: async function (req, res) {
        const locker = new LockerModel({
            name: req.body.name,
            location: req.body.location,
            label: req.body.label,
            status: req.body.status,
            createdAt: req.body.createdAt
        });

        try {
            const savedLocker = await locker.save();
            return res.status(201).json(savedLocker);
        } catch (err) {
            return res.status(500).json({
                message: 'Error when creating locker',
                error: err
            });
        }
    },

    /**
     * lockerController.update()
     */
    update: async function (req, res) {
        const id = req.params.id;

        try {
            const locker = await LockerModel.findOne({_id: id});

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

            const updatedLocker = await locker.save();
            return res.json(updatedLocker);
        } catch (err) {
            return res.status(500).json({
                message: 'Error when updating locker.',
                error: err
            });
        }
    },

    /**
     * lockerController.remove()
     */
    remove: async function (req, res) {
        const id = req.params.id;

        try {
            await LockerModel.findByIdAndRemove(id);
            return res.status(204).json();
        } catch (err) {
            return res.status(500).json({
                message: 'Error when deleting the locker.',
                error: err
            });
        }
    }
};
