var express = require('express');
var router = express.Router();
var boxController = require('../controllers/boxController.js');
var UserModel = require('../models/userModel.js');
const rateLimit = require('express-rate-limit');


const unlockLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 3,
    message: 'Too many unlock requests from this IP, please try again after a minute'
});

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
router.post('/add', requireAuth, boxController.addBox);
router.post('/unlock', requireAuth, unlockLimiter, boxController.requestBoxUnlock);
router.post('/authorize/:id', requireAuth, boxController.authorizeBox);

// PATCH
router.patch('/update/:id', requireAuth, boxController.updateBox);

// DELETE
router.delete('/remove/:id', requireAuth, boxController.removeBox);

module.exports = router;