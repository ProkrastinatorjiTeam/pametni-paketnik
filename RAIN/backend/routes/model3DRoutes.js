var express = require('express');
var router = express.Router();
var model3DController = require('../controllers/model3DController.js');
var { requireAdmin } = require('../middleware/auth'); // Your auth middleware
var upload = require('../middleware/multerConfig'); // YOUR MULTER CONFIGURATION MIDDLEWARE

/*
 * GET
 */
router.get('/list', model3DController.listModels3D);

/*
 * GET
 */
router.get('/show/:id', model3DController.showModel3D);

/*
 * POST
 */
router.post('/add', requireAdmin, upload.fields([{name: 'images', maxCount: 5}]), model3DController.addModel3D);

/*
 * PUT
 */
router.patch(
    '/update/:id',
    requireAdmin,
    upload.fields([{ name: 'newImages', maxCount: 5 }]), // Adjust maxCount as needed
    model3DController.updateModel3D
);

/*
 * DELETE
 */
router.delete('/remove/:id', requireAdmin, model3DController.removeModel3D);

/*
 * DELETE an image from a model
 */
router.delete('/:id/images/:imageFilename', requireAdmin, model3DController.removeImageFromModel);

module.exports = router;
