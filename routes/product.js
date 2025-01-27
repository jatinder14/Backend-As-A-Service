const express = require('express');
const Product = require('../models/Product');
const { generateSignedUrl, getKey } = require('../utils/s3');
const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const product = new Product(req.body);
        await product.save();
        res.status(201).json(product);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10, category } = req.query;
        const query = {};

        if (category) {
            query.category = { $regex: category, $options: 'i' };
        }

        const totalProducts = await Product.countDocuments(query);
        const products = await Product.find(query)
            .limit(limit * 1)
            .skip((page - 1) * limit);

        // Generate signed URLs for logos and images in parallel for each Product
        const productsWithSignedUrls = await Promise.all(
            products.map(async (Product) => {
                const imagesPromises = Product.images && Array.isArray(Product.images)
                    ? Product.images.map(image => generateSignedUrl(getKey(image)))
                    : [];

                const [imagesSignedUrls] = await Promise.all([
                    Promise.all(imagesPromises)
                ]);

                // Assign signed URLs back to the Product object
                Product.images = imagesSignedUrls;

                return Product;
            })
        );

        res.json({
            totalProducts,
            currentPage: page,
            totalPages: Math.ceil(totalProducts / limit),
            products: productsWithSignedUrls
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });

        // Run logo and images transformations in parallel
        const imagesPromises = product.images && Array.isArray(product.images)
            ? product.images.map(image => generateSignedUrl(getKey(image)))
            : [];

        // Await all promises concurrently
        const [imagesSignedUrls] = await Promise.all([
            Promise.all(imagesPromises)
        ]);

        // Assign the results to Product fields
        product.images = imagesSignedUrls;

        res.status(200).json(product);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


router.put('/:id', async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.status(200).json(product);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.status(200).json({ message: 'Product deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
