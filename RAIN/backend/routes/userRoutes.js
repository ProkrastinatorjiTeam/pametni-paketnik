var express = require('express');
var router = express.Router();
var userController = require('../controllers/userController.js');
const UserModel = require("../models/userModel");

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

function requireAuth(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    } else {
        res.status(401).json({ message: 'You need to login to view this page.' });
    }
}

function requireNotAuth(req, res, next) {
    if (req.session && req.session.userId) {
        return res.status(400).json({ message: 'You are already logged in.' });
    }
    next();
}


// GET
router.get('/list', requireAdmin, userController.listUsers);
router.get('/show', requireAuth, userController.showSelf);
router.get('/show/:id', requireAdmin, userController.showUser);
router.get('/history', requireAuth, userController.showSelfUnlockHistory);
router.get('/history/:id', requireAdmin, userController.showUserUnlockHistory);

// POST
router.post('/register', requireNotAuth, userController.registerSelf);
router.post('/login', requireNotAuth, userController.loginSelf);
router.post('/logout', requireAuth, userController.logoutSelf);

// PATCH
router.patch('/update', requireAuth, userController.updateSelf);
router.patch('/update/:id', requireAdmin, userController.updateUser);

// DELETE
router.delete('/remove', requireAuth, userController.removeSelf);
router.delete('/remove/:id', requireAdmin, userController.removeUser);


module.exports = router;