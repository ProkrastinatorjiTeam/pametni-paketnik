var Model3dModel = require('../models/model3DModel.js');

/**
 * model3DController.js
 *
 * @description :: Server-side logic for managing model3Ds.
 */
module.exports = {

    /**
     * model3DController.list()
     */
    listModels3D: function (req, res) {
        Model3dModel.find(function (err, model3Ds) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when getting model3D.',
                    error: err
                });
            }

            return res.json(model3Ds);
        });
    },

    /**
     * model3DController.show()
     */
    showModel3D: function (req, res) {
        var id = req.params.id;

        Model3dModel.findOne({_id: id}, function (err, model3D) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when getting model3D.',
                    error: err
                });
            }

            if (!model3D) {
                return res.status(404).json({
                    message: 'No such model3D'
                });
            }

            return res.json(model3D);
        });
    },

    /**
     * model3DController.create()
     */
    addModel3D: function (req, res) {
        var model3D = new Model3dModel({
			name : req.body.name,
			description : req.body.description,
			images : req.body.images,
			createdBy : req.body.createdBy,
			createdAt : req.body.createdAt
        });

        model3D.save(function (err, model3D) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when creating model3D',
                    error: err
                });
            }

            return res.status(201).json(model3D);
        });
    },

    /**
     * model3DController.update()
     */
    updateModel3D: function (req, res) {
        var id = req.params.id;

        Model3dModel.findOne({_id: id}, function (err, model3D) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when getting model3D',
                    error: err
                });
            }

            if (!model3D) {
                return res.status(404).json({
                    message: 'No such model3D'
                });
            }

            model3D.name = req.body.name ? req.body.name : model3D.name;
			model3D.description = req.body.description ? req.body.description : model3D.description;
			model3D.images = req.body.images ? req.body.images : model3D.images;
			model3D.createdBy = req.body.createdBy ? req.body.createdBy : model3D.createdBy;
			model3D.createdAt = req.body.createdAt ? req.body.createdAt : model3D.createdAt;
			
            model3D.save(function (err, model3D) {
                if (err) {
                    return res.status(500).json({
                        message: 'Error when updating model3D.',
                        error: err
                    });
                }

                return res.json(model3D);
            });
        });
    },

    /**
     * model3DController.remove()
     */
    removeModel3D: function (req, res) {
        var id = req.params.id;

        Model3dModel.findByIdAndRemove(id, function (err, model3D) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when deleting the model3D.',
                    error: err
                });
            }

            return res.status(204).json();
        });
    }
};
