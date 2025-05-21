var express = require('express');
var router = express.Router();
var unlockController = require('../controllers/unlockController.js');
const rateLimit = require("express-rate-limit");
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
const unlockLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // Limit each IP to 3 requests per windowMs
  message: "Too many unlock requests from this IP, please try again after a minute",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
/*
 * GET
 */
router.get('/list', requireAdmin, unlockController.listUnlocks);
router.get('/history', requireAuth, unlockController.selfUnlockHistory);
router.get('/history/:id', requireAdmin, unlockController.userUnlockHistory);
router.get('/show/:id', requireAuth, unlockController.showUnlockInfo);

/*
 * POST
 */
router.post('/create', requireAdmin, unlockController.createUnlock);
router.post('/add', requireAuth, unlockLimiter, unlockController.addUnlock);

/*
 * PATCH
 */
router.patch('/update/:id', requireAdmin, unlockController.updateUnlock);

/*
 * DELETE
 */
router.delete('/remove/:id', requireAdmin, unlockController.removeUnlock);

module.exports = router;
