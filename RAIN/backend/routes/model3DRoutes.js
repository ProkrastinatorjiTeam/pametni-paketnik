var express = require('express');
var router = express.Router();
var model3DController = require('../controllers/model3DController.js');
var multer = require('multer');
var upload = multer({dest: 'public/images/'});

const {requireAdmin} = require('../middleware/auth');

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
router.patch('update/:id', requireAdmin, model3DController.updateModel3D);

/*
 * DELETE
 */
router.delete('remove/:id', requireAdmin, model3DController.removeModel3D);

module.exports = router;
