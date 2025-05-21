var express = require('express');
var router = express.Router();
var boxController = require('../controllers/boxController.js');
var UserModel = require('../models/userModel.js');

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
router.get('/list', boxController.listBoxes);
router.get('/add', reqireAdmin, boxController.showAddForm);  // Why?
router.get('/authorize', boxController.authorizeUser); 
router.get('/show/:id', requireAuth, boxController.showBoxInfo);

/*
 * POST
 */
router.post('/create', reqireAdmin, boxController.createBox);
router.post('/assign/:id', reqireAdmin, boxController.assignBox);

/*
 * PATCH
 */
router.patch('/update/:id', reqireAdmin, boxController.updateBox);

/*
 * DELETE
 */
router.delete('/remove/:id', reqireAdmin, boxController.removeBox);

module.exports = router;
