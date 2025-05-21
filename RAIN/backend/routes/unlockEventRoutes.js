var express = require('express');
var router = express.Router();
var unlockEventController = require('../controllers/unlockEventController.js');
const UserModel = require("../models/userModel.js");

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
router.get('/list', requireAdmin, unlockEventController.listUnlockEvents);  
router.get('/show/:id', requireAuth, unlockEventController.showUnlockEvent);


// POST
router.post('/create', requireAdmin, unlockEventController.createUnlockEvent);


// PATCH
router.patch('/update/:id', requireAdmin, unlockEventController.updateUnlockEvent);


// DELETE
router.delete('/remove/:id', requireAdmin, unlockEventController.removeUnlockEvent);    


module.exports = router;