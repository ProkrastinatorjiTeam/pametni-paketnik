var express = require('express');
var router = express.Router();
var lockerController = require('../controllers/lockerController.js');
var UserModel = require('../models/userModel');

function reqireAdmin(req, res, next) {
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

/*
 * GET
 */
router.get('/list', lockerController.listLockers);
router.get('/add', reqireAdmin, lockerController.showAddForm);  // Why?
router.get('/info/:id', requireAuth, lockerController.getLockerInfo);

/*
 * POST
 */
router.post('/create', reqireAdmin, lockerController.createLocker);

/*
 * PATCH
 */
router.patch('/update/:id', reqireAdmin, lockerController.updateLocker);

/*
 * DELETE
 */
router.delete('/remove/:id', reqireAdmin, lockerController.removeLocker);

module.exports = router;
