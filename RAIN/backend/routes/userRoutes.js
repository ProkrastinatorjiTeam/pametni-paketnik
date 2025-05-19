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


/*
 * GET
 */

router.get('/list', requireAdmin, userController.listUsers);
router.get('/register', requireNotAuth, userController.showRegisterForm);
router.get('/login', requireNotAuth, userController.showLoginForm);
router.get('/auth', userController.checkAuth);
//router.get('/profile', userController.getSelfInfo);
router.get('/profile/:id', userController.getUserInfo);

/*
 * POST
 */
router.post('/register', userController.registerSelf);
router.post('/login', userController.loginSelf);
router.post('/logout', userController.logoutSelf);
//router.post('/update', requireAuth, userController.updateSelf);
router.post('/update/:id', requireAdmin, userController.updateUser);


/*
 * DELETE
 */
//router.delete('/remove', requireAuth, userController.deleteSelf);
router.delete('/remove/:id', requireAdmin, userController.removeUser);

module.exports = router;
