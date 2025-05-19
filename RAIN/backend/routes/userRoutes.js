var express = require('express');
var router = express.Router();
var userController = require('../controllers/userController.js');
const UserModel = require("../models/userModel");

function isAdmin(req, res, next) {
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
function preventLoginIfAuthenticated(req, res, next) {
    if (req.session && req.session.userId) {
        return res.status(400).json({ message: 'You are already logged in.' });
    }
    next();
}
/*
 * GET
 */

router.get('/list', isAdmin,userController.list);
router.get('/register', preventLoginIfAuthenticated, userController.showRegister);
router.get('/login', preventLoginIfAuthenticated,userController.showLogin);
router.get('/auth', userController.checkAuth);
//router.get('/profile', userController.showProfile);
router.get('/show/:id', userController.show);

/*
 * POST
 */
router.post('/register', userController.create);
router.post('/login', userController.login);
router.post('/logout',userController.logout);
router.post('/update/:id', userController.update);


/*
 * DELETE
 */
router.delete('/:id', userController.remove);

module.exports = router;
