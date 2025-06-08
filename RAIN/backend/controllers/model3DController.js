const Model3dModel = require('../models/model3DModel.js');

module.exports = {
    // GET /api/models
    listModels3D: async (req, res) => {
        try {
            const model3Ds = await Model3dModel.find();
            res.json(model3Ds);
        } catch (err) {
            res.status(500).json({
                message: 'Error when getting model3D.',
                error: err
            });
        }
    },

    // GET /api/models/:id
    showModel3D: async (req, res) => {
        try {
            const model3D = await Model3dModel.findById(req.params.id);
            if (!model3D) {
                return res.status(404).json({message: 'No such model3D'});
            }
            res.json(model3D);
        } catch (err) {
            res.status(500).json({
                message: 'Error when getting model3D.',
                error: err
            });
        }
    },

    // POST /api/models
    addModel3D: async (req, res) => {
        try {
            console.log("Uploaded Files:", JSON.stringify(req.files, null, 2));
            const imagePaths = req.files.images.map(file => '/images/' + file.filename);

            const model3D = new Model3dModel({
                name: req.body.name,
                description: req.body.description,
                images: imagePaths,
                createdBy: req.session.userId,
                createdAt: req.body.createdAt,
                estimatedPrintTime: req.body.estimatedPrintTime,
                price: req.body.price ? parseFloat(req.body.price) : null,
            });
            console.log("Body:", req.body);
            console.log("Files:", req.files);
            const savedModel = await model3D.save();
            res.status(201).json(savedModel);
        } catch (err) {
            console.error('Error when creating model3D:', err);
            res.status(500).json({
                message: 'Error when creating model3D',
                error: err.message || 'An internal server error occurred.'
            });
        }
    },

    // PUT /api/models/:id
    updateModel3D: async (req, res) => {
        try {
            const model3D = await Model3dModel.findById(req.params.id);
            if (!model3D) {
                return res.status(404).json({message: 'No such model3D'});
            }

            model3D.name = req.body.name ?? model3D.name;
            model3D.description = req.body.description ?? model3D.description;
            model3D.images = req.body.images ?? model3D.images;
            model3D.createdBy = req.body.createdBy ?? model3D.createdBy;
            model3D.createdAt = req.body.createdAt ?? model3D.createdAt;
            model3D.estimatedPrintTime = req.body.estimatedPrintTime ?? model3D.estimatedPrintTime;
            if (req.body.price !== undefined) {
                model3D.price = req.body.price === '' || req.body.price === null ? null : parseFloat(req.body.price);
            }

            const updatedModel = await model3D.save();
            res.json(updatedModel);
        } catch (err) {
            res.status(500).json({
                message: 'Error when updating model3D.',
                error: err
            });
        }
    },

    // DELETE /api/models/:id
    removeModel3D: async (req, res) => {
        try {
            await Model3dModel.findByIdAndDelete(req.params.id);
            res.status(204).send();
        } catch (err) {
            res.status(500).json({
                message: 'Error when deleting the model3D.',
                error: err
            });
        }
    }
};
