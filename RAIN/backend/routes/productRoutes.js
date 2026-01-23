var mongoose = require('mongoose');
var express = require('express');
var router = express.Router();

var productController = require('../controllers/productController.js');
var { requireAdmin } = require('../middleware/auth');
var upload = require('../middleware/multerConfig');

/*
 * GET /api/products
 */
router.get('/list', productController.listProducts);

router.get('/image/:filename', productController.serveImage);
/*
 * GET /api/products/:id
 */
router.get('/show/:id', productController.showProduct);

/*
 * POST /api/products
 * Farmer/Admin adds a product
 */
router.post(
    '/add',
    requireAdmin,
    upload.fields([{ name: 'images', maxCount: 5 }]),
    productController.addProduct
);

/*
 * PUT /api/products/:id
 */
router.patch(
    '/update/:id',
    requireAdmin,
    upload.fields([{ name: 'newImages', maxCount: 5 }]),
    productController.updateProduct
);

/*
 * DELETE /api/products/:id
 */
router.delete(
    '/remove/:id',
    requireAdmin,
    productController.removeProduct
);

/*
 * DELETE /api/products/:id/images/:imageFilename
 */
router.delete(
    '/:id/images/:imageFilename',
    requireAdmin,
    productController.removeImage
);

module.exports = router;
