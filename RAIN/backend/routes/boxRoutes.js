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
router.get('/show/:id', requireAdmin, boxController.showBox);
router.get('/history/:id', requireAdmin, boxController.getBoxUnlockHistory);

// POST
router.post('/add', requireAdmin, boxController.addBox);
router.post('/unlock', requireAuth, unlockLimiter, boxController.requestBoxUnlock);
router.post('/authorize/:id', requireAdmin, boxController.authorizeBox);
router.post('/check-access', requireAdmin, boxController.checkAccess)

// PATCH
router.patch('/update/:id', requireAdmin, boxController.updateBox);

// DELETE
router.delete('/remove/:id', requireAdmin, boxController.removeBox);

module.exports = router;