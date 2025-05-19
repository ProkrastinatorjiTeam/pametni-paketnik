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
router.get('/',lockerController.list);
router.get('/add', reqireAdmin, lockerController.add);

/*
 * GET
 */
router.get('/:id', requireAuth,lockerController.show);

/*
 * POST
 */
router.post('/', reqireAdmin, lockerController.create);

/*
 * PUT
 */
router.put('/:id', reqireAdmin,lockerController.update);

/*
 * DELETE
 */
router.delete('/:id', reqireAdmin, lockerController.remove);

module.exports = router;
