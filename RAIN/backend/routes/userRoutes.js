var express = require('express');
var router = express.Router();
var userController = require('../controllers/userController.js');

const {requireAdmin, requireAuth, requireNotAuth} = require('../middleware/auth');

// GET
router.get('/list', requireAdmin, userController.listUsers);
router.get('/show', requireAuth, userController.showSelf);
router.get('/show/:id', requireAdmin, userController.showUser);
router.get('/history', requireAuth, userController.showSelfUnlockHistory);
router.get('/history/:id', requireAdmin, userController.showUserUnlockHistory);
router.get('/boxes', requireAuth, userController.showSelfAuthorizedBoxes);
router.get('/boxes/:id', requireAdmin, userController.showUserAuthorizedBoxes);

// POST
router.post('/register', requireNotAuth, userController.registerSelf);
router.post('/login', requireNotAuth, userController.loginSelf);
router.post('/logout', requireAuth, userController.logoutSelf);

// PATCH
router.patch('/update', requireAuth, userController.updateSelf);
router.patch('/update/:id', requireAdmin, userController.updateUser);

// DELETE
router.delete('/remove', requireAuth, userController.removeSelf);
router.delete('/remove/:id', requireAdmin, userController.removeUser);


module.exports = router;