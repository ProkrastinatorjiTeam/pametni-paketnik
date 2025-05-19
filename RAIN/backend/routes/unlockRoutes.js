var express = require('express');
var router = express.Router();
var unlockController = require('../controllers/unlockController.js');
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
router.get('/', requireAdmin,unlockController.list);

/*
 * GET
 */
router.get('/:id', requireAuth,unlockController.show);

/*
 * POST
 */
router.post('/', requireAuth,unlockController.createUnlock);

/*
 * PUT
 */
router.put('/:id', requireAdmin, unlockController.update);

/*
 * DELETE
 */
router.delete('/:id', requireAdmin, unlockController.remove);

module.exports = router;
