var express = require('express');
var router = express.Router();
var lockerController = require('../controllers/lockerController.js');

/*
 * GET
 */
router.get('/', lockerController.list);

/*
 * GET
 */
router.get('/:id', lockerController.show);

/*
 * POST
 */
router.post('/', lockerController.create);

/*
 * PUT
 */
router.put('/:id', lockerController.update);

/*
 * DELETE
 */
router.delete('/:id', lockerController.remove);

module.exports = router;
