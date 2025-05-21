var express = require('express');
var router = express.Router();
var boxController = require('../controllers/boxController.js');
var UserModel = require('../models/userModel.js');

function requireAdmin(req, res, next) {
    if (req.session && req.session.userId) {
        UserModel.findById(req.session.userId)
            .then(user => {
                if (user && user.role === 'admin') {
                    next();
                } else {
                    res.status(403).json({ message: 'Access denied. Admins only.' });
                }
            })
            .catch(err => {
                res.status(500).json({ message: 'Server error' });
            });
    } else {
        res.status(401).json({ message: 'Not authenticated' });
    }
}
function requireAuth(req, res, next){
    if(req.session && req.session.userId){
        return next();
    } else{
        res.status(401).json({ message: 'You need to login to view this page.' });
    }
}

// GET
router.get('/list', requireAdmin, boxController.listBoxes);
router.get('/show/:id', requireAuth, boxController.showBox);
router.get('/history/:id', requireAuth, boxController.getBoxUnlockHistory);

// POST
router.post('/create', requireAdmin, boxController.createBox);
router.post('/unlock', requireAuth, boxController.requestBoxUnlock);
router.post('/assign/:id', requireAdmin, boxController.assignBox);

// PATCH
router.patch('/update/:id', requireAdmin, boxController.updateBox);

// DELETE
router.delete('/remove/:id', requireAdmin, boxController.removeBox);


module.exports = router;