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

            let priceValue = null;
            if (req.body.price && req.body.price !== "null" && req.body.price !== "") {
                const parsedPrice = parseFloat(req.body.price);
                if (!isNaN(parsedPrice)) {
                    priceValue = parsedPrice;
                }
            }

            const model3D = new Model3dModel({
                name: req.body.name,
                description: req.body.description,
                images: imagePaths,
                createdBy: req.session.userId,
                // createdAt is usually set by default: Date.now in schema or by Mongoose
                estimatedPrintTime: req.body.estimatedPrintTime ? parseInt(req.body.estimatedPrintTime, 10) : null,
                price: priceValue, 
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
        console.log(`[updateModel3D] Attempting to update model ID: ${req.params.id}`);
        console.log("[updateModel3D] Raw req.body:", JSON.stringify(req.body, null, 2));
        console.log("[updateModel3D] Raw req.files:", JSON.stringify(req.files, null, 2));

        try {
            const model3D = await Model3dModel.findById(req.params.id);
            if (!model3D) {
                return res.status(404).json({message: 'No such model3D'});
            }

            // Handle text fields
            if (req.body.name !== undefined) {
                console.log(`[updateModel3D] Updating name to: ${req.body.name}`);
                model3D.name = req.body.name;
            }
            if (req.body.description !== undefined) {
                console.log(`[updateModel3D] Updating description to: ${req.body.description}`);
                model3D.description = req.body.description;
            }
            if (req.body.estimatedPrintTime !== undefined) {
                const estPrintTime = parseInt(req.body.estimatedPrintTime, 10);
                console.log(`[updateModel3D] Updating estimatedPrintTime to: ${estPrintTime}`);
                model3D.estimatedPrintTime = isNaN(estPrintTime) ? null : estPrintTime;
            }

            // Corrected price handling
            if (req.body.price !== undefined) {
                if (req.body.price === '' || req.body.price === null || req.body.price === "null") {
                    console.log(`[updateModel3D] Setting price to null`);
                    model3D.price = null;
                } else {
                    const parsedPrice = parseFloat(req.body.price);
                    console.log(`[updateModel3D] Updating price to: ${parsedPrice}`);
                    model3D.price = isNaN(parsedPrice) ? null : parsedPrice;
                }
            }

            // Handle new image uploads (assuming multer is configured for 'newImages')
            if (req.files && req.files.newImages && req.files.newImages.length > 0) {
                console.log(`[updateModel3D] Adding ${req.files.newImages.length} new image(s).`);
                const newImagePaths = req.files.newImages.map(file => '/images/' + file.filename);
                model3D.images = [...model3D.images, ...newImagePaths];
            } else if (req.files && (!req.files.newImages || req.files.newImages.length === 0)) {
                console.log("[updateModel3D] req.files.newImages is present but empty or not an array.");
            } else {
                console.log("[updateModel3D] No new files found in req.files.newImages.");
            }
            // Note: Deletion of existing images is handled by a separate endpoint 
            // in your frontend (handleDeleteExistingImage). 
            // If you wanted to manage existing images to keep via this update endpoint,
            // you'd need to send a list of existing image paths to keep and reconcile.
            // For now, this just adds new images.

            // createdBy and createdAt are generally not updated after creation.
            // If you intend to update them, ensure it's the correct logic.
            // model3D.createdBy = req.body.createdBy ?? model3D.createdBy; 
            // model3D.createdAt = req.body.createdAt ?? model3D.createdAt;

            const updatedModel = await model3D.save();
            console.log("[updateModel3D] Model saved successfully.");
            return res.status(200).json({message: 'Model updated successfully', model3D: updatedModel});

        } catch (err) {
            console.error("[updateModel3D] Error during update:", err);
            if (err.name === 'ValidationError') {
                return res.status(400).json({ message: 'Validation Error', errors: err.errors });
            }
            return res.status(500).json({message: 'Error updating model3D', error: err.message});
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
