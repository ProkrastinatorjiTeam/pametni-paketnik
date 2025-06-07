var express = require('express');
var router = express.Router();
var unlockEventController = require('../controllers/unlockEventController.js');

const {requireAdmin, requireAuth} = require('../middleware/auth');

// GET
router.get('/list', requireAdmin, unlockEventController.listUnlockEvents);  
router.get('/show/:id', requireAuth, unlockEventController.showUnlockEvent);


// POST
router.post('/create', requireAuth, unlockEventController.createUnlockEvent);


// PATCH
router.patch('/update/:id', requireAdmin, unlockEventController.updateUnlockEvent);


// DELETE
router.delete('/remove/:id', requireAdmin, unlockEventController.removeUnlockEvent);    


module.exports = router;