var express = require('express');
var router = express.Router();
var unlockController = require('../controllers/unlockController.js');

/*
 * GET
 */
router.get('/', unlockController.list);

/*
 * GET
 */
router.get('/:id', unlockController.show);

/*
 * POST
 */
router.post('/', unlockController.create);

/*
 * PUT
 */
router.put('/:id', unlockController.update);

/*
 * DELETE
 */
router.delete('/:id', unlockController.remove);

module.exports = router;
