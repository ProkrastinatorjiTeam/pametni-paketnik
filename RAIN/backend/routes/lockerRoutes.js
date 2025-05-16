var express = require('express');
var router = express.Router();
var lockerController = require('../controllers/lockerController.js');
var UserModel = require('../models/userModel');

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
function requiresLogin(req, res, next){
    if(req.session && req.session.userId){
        return next();
    } else{
        res.status(401).json({ message: 'You need to login to view this page.' });
    }
}
/*
 * GET
 */
router.get('/',lockerController.list);
router.get('/add', isAdmin, lockerController.add);

/*
 * GET
 */
router.get('/:id', requiresLogin,lockerController.show);

/*
 * POST
 */
router.post('/', isAdmin, lockerController.create);

/*
 * PUT
 */
router.put('/:id', isAdmin,lockerController.update);

/*
 * DELETE
 */
router.delete('/:id', isAdmin, lockerController.remove);

module.exports = router;
