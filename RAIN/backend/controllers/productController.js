const productModel = require('../models/productModel.js');
const {execFile} = require('child_process');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
sharp.cache(false);

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const isWindows = process.platform === 'win32';
const COMPRESSOR_PATH = path.join(__dirname, '../compress', isWindows ? 'dct.exe' : 'compressor');

const safeDelete = async (filepath) => {
    for (let i = 0; i < 5; i++) {
        try {
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
            }
            return;
        } catch (err) {
            if (err.code === 'EPERM' || err.code === 'EBUSY') {
                await wait(200);
            } else {
                console.error(`Ni mogoče izbrisati ${filepath}:`, err.message);
                return;
            }
        }
    }
    console.error(`Datoteka ostaja zaklenjena po 5 poskusih: ${filepath}`);
};

module.exports = {

    // GET /api/products
    listProducts: async (req, res) => {
        try {
            const products = await productModel.find().populate('producer', 'username');
            res.json(products);
        } catch (err) {
            res.status(500).json({
                message: 'Error when getting products.',
                error: err.message
            });
        }
    },

    // GET /api/products/:id
    showProduct: async (req, res) => {
        try {
            const product = await productModel
                .findById(req.params.id)
                .populate('producer', 'username');

            if (!product) {
                return res.status(404).json({message: 'Product not found'});
            }

            res.json(product);
        } catch (err) {
            res.status(500).json({
                message: 'Error when getting product.',
                error: err.message
            });
        }
    },

    // POST /api/products
    addProduct: async (req, res) => {
        try {
            const imagePaths = req.files?.images
                ? req.files.images.map(file => '/images/' + file.filename)
                : [];

            const processedImages = [];

            for (const file of req.files.images) {
                const originalPath = file.path;

                const resizedPath = path.join(path.dirname(originalPath), 'resized-' + file.filename);

                await sharp(originalPath)
                    .resize(1000, null, {
                        withoutEnlargement: true,
                        fit: 'inside'
                    })
                    .toFile(resizedPath);

                const outputBaseName = path.join(path.dirname(originalPath), path.parse(file.filename).name);
                const dctPath = outputBaseName + '.dct';

                const factor = 30;
                await new Promise((resolve, reject) => {
                    execFile(COMPRESSOR_PATH, ['compress', resizedPath, outputBaseName, factor.toString()], (err, stdout, stderr) => {
                        if (err) {
                            console.error('DCT Error:', err);
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });

                await safeDelete(originalPath);
                await safeDelete(resizedPath);

                const relativeDctPath = '/images/' + path.parse(file.filename).name + '.dct';
                processedImages.push(relativeDctPath);
            }

            const product = new productModel({
                name: req.body.name,
                description: req.body.description,
                images: processedImages,
                price: parseFloat(req.body.price),
                unit: req.body.unit || 'piece',
                quantityAvailable: parseInt(req.body.quantityAvailable, 10),
                producer: req.session.userId,
                expiresAt: req.body.expiresAt || null
            });

            const savedProduct = await product.save();
            res.status(201).json(savedProduct);

        } catch (err) {
            console.error('Error creating product:', err);
            res.status(400).json({
                message: 'Error creating product',
                error: err.message
            });
        }
    },


    serveImage: async (req, res) => {
        let tempDir = null;
        let finalImagePath = null;

        try {
            const filename = req.params.filename;
            const dctFilePath = path.join(__dirname, '../public/images', filename);

            if (!fs.existsSync(dctFilePath) || !filename.endsWith('.dct')) {
                return res.status(404).send('Image not found');
            }

            const stats = fs.statSync(dctFilePath);
            const etag = `W/"${stats.size}-${stats.mtime.getTime()}"`;

            if (req.headers['if-none-match'] === etag) {
                return res.status(304).end();
            }

            const tempOutputBase = path.join(__dirname, '../public/temp', 'temp_' + Date.now() + Math.random());
            tempDir = path.dirname(tempOutputBase);
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, {recursive: true});
            }

            await new Promise((resolve, reject) => {
                execFile(COMPRESSOR_PATH,
                    ['decompress', dctFilePath, tempOutputBase],
                    (err, stdout, stderr) => {
                        if (err) {
                            console.error('DCT Decompress Error:', stderr);
                            reject(err);
                        } else {
                            resolve(stdout);
                        }
                    });
            });

            const dirFiles = fs.readdirSync(tempDir);
            const generatedFile = dirFiles.find(f => path.join(tempDir, f).startsWith(tempOutputBase));

            if (!generatedFile) {
                throw new Error('Decompression finished but file not found');
            }

            finalImagePath = path.join(tempDir, generatedFile);

            res.setHeader('ETag', etag);
            res.setHeader('Cache-Control', 'public, max-age=3600');

            res.sendFile(finalImagePath, (err) => {
                if (err && !res.headersSent) {
                    console.error("Napaka pri pošiljanju:", err);
                    res.status(500).end();
                }
                try {
                    if (finalImagePath && fs.existsSync(finalImagePath)) {
                        fs.unlinkSync(finalImagePath);
                    }
                } catch (unlinkErr) { console.error(unlinkErr); }
            });

        } catch (err) {
            console.error('Serve Image Error:', err);
            try {
                if (finalImagePath && fs.existsSync(finalImagePath)) fs.unlinkSync(finalImagePath);
            } catch (e) {}

            if (!res.headersSent) {
                res.status(500).send('Error serving image');
            }
        }
    },

    // PUT /api/products/:id
    updateProduct: async (req, res) => {
        try {
            const product = await productModel.findById(req.params.id);

            if (!product) {
                return res.status(404).json({message: 'Product not found'});
            }

            if (req.body.name !== undefined) product.name = req.body.name;
            if (req.body.description !== undefined) product.description = req.body.description;
            if (req.body.price !== undefined) product.price = parseFloat(req.body.price);
            if (req.body.unit !== undefined) product.unit = req.body.unit;
            if (req.body.quantityAvailable !== undefined) {
                product.quantityAvailable = parseInt(req.body.quantityAvailable, 10);
            }
            if (req.body.expiresAt !== undefined) {
                product.expiresAt = req.body.expiresAt || null;
            }

            // add new images
            if (req.files?.newImages?.length > 0) {
                const newImages = req.files.newImages.map(
                    file => '/images/' + file.filename
                );
                product.images.push(...newImages);
            }

            const updatedProduct = await product.save();
            res.json(updatedProduct);

        } catch (err) {
            res.status(500).json({
                message: 'Error updating product',
                error: err.message
            });
        }
    },


    // DELETE /api/products/:id
    removeProduct: async (req, res) => {
        try {
            const deleted = await productModel.findByIdAndDelete(req.params.id);

            if (!deleted) {
                return res.status(404).json({message: 'Product not found'});
            }

            res.status(204).send();
        } catch (err) {
            res.status(500).json({
                message: 'Error deleting product',
                error: err.message
            });
        }
    },

    // DELETE /api/products/:id/images/:imageFilename
    removeImage: async (req, res) => {
        const {id, imageFilename} = req.params;

        try {
            const product = await productModel.findById(id);
            if (!product) {
                return res.status(404).json({message: 'Product not found'});
            }

            const imagePath = '/images/' + imageFilename;
            const index = product.images.indexOf(imagePath);

            if (index === -1) {
                return res.status(404).json({message: 'Image not found'});
            }

            // delete file
            const fs = require('fs');
            const path = require('path');
            const fullPath = path.join(__dirname, '../public', imagePath);

            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }

            product.images.splice(index, 1);
            await product.save();

            res.json({message: 'Image deleted', product});

        } catch (err) {
            res.status(500).json({
                message: 'Error deleting image',
                error: err.message
            });
        }
    }
};
