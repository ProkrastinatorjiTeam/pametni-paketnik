var express = require('express');
var router = express.Router();
var boxController = require('../controllers/boxController.js');
const rateLimit = require('express-rate-limit');

const {requireAdmin, requireAuth} = require('../middleware/auth');

const unlockLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 3,
    message: 'Too many unlock requests from this IP, please try again after a minute'
});

// GET
router.get('/list', requireAuth, boxController.listBoxes); 
router.get('/show/:id', requireAuth, boxController.showBox);
router.get('/history/:id', requireAuth, boxController.getBoxUnlockHistory);

// POST
router.post('/add', requireAuth, boxController.addBox);
router.post('/unlock', requireAuth, unlockLimiter, boxController.requestBoxUnlock);
router.post('/authorize/:id', requireAuth, boxController.authorizeBox);
router.post('/check-access', requireAuth, boxController.checkAccess)

// PATCH
router.patch('/update/:id', requireAuth, boxController.updateBox);

// DELETE
router.delete('/remove/:id', requireAuth, boxController.removeBox);

module.exports = router;