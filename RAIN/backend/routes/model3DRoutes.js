var express = require('express');
var router = express.Router();
var model3DController = require('../controllers/model3DController.js');
const UserModel = require("../models/userModel");
var multer = require('multer');
var upload = multer({dest: 'public/model3D/images/'});


function requireAdmin(req, res, next) {
    if (req.session && req.session.userId) {
        UserModel.findById(req.session.userId)
            .then(user => {
                if (user && user.role === 'admin') {
                    next();
                } else {
                    res.status(403).json({message: 'Access denied. Admins only.'});
                }
            })
            .catch(err => {
                res.status(500).json({message: 'Server error'});
            });
    } else {
        res.status(401).json({message: 'Not authenticated'});
    }
}

/*
 * GET
 */
router.get('/', model3DController.listModels3D);

/*
 * GET
 */
router.get('/:id', model3DController.showModel3D);

/*
 * POST
 */
router.post('/', requireAdmin, upload.fields([{name: 'images', maxCount: 5}]), model3DController.addModel3D);

/*
 * PUT
 */
router.put('/:id', requireAdmin, model3DController.updateModel3D);

/*
 * DELETE
 */
router.delete('/:id', requireAdmin, model3DController.removeModel3D);

module.exports = router;
