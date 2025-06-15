const express = require('express');
const SeoTag = require('../models/SeoTagSchema');
const { isValidObjectId } = require('mongoose');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10, sortBy = 'date', order = 'desc' } = req.query;
        const sortOrder = order === 'asc' ? 1 : -1;
        let filter = {}

        const totalSeoTags = await SeoTag.countDocuments(filter);

        const seoTags = await SeoTag.find(filter)
            .sort({ [sortBy]: sortOrder })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        res.json({
            totalSeoTags,
            currentPage: page,
            totalPages: Math.ceil(totalSeoTags / limit),
            seoTags
        }
        );
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get a single seoTags by ID (with error handling for non-existent ID)
router.get('/:idOrSlug', async (req, res) => {
    try {
        const { idOrSlug } = req.params;
        let seoTags;

        if (isValidObjectId(idOrSlug)) {
            seoTags = await SeoTag.findById(idOrSlug);
        }

        if (!seoTags) {
            return res.status(404).json({ message: 'SeoTag not found' });
        }

        res.json(seoTags);
    } catch (err) {
        res.status(500).json({ message: 'Invalid seoTags ID', error: err.message });
    }
});

// Create a new seoTags
router.post('/', async (req, res) => {
    const { title, meta_title, meta_keywords, meta_description } = req.body;

    try {
        const seoTags = new SeoTag({ title, meta_title, meta_keywords, meta_description });
        await seoTags.save();
        res.status(201).json(seoTags);
    } catch (err) {
        res.status(500).json({ message: 'Error creating seoTags', error: err.message });
    }
});

// Update a seoTags by ID
router.put('/:id', async (req, res) => {
    const { title, meta_title, meta_keywords, meta_description } = req.body;

    try {
        const seoTags = await SeoTag.findById(req.params.id);
        if (!seoTags) {
            return res.status(404).json({ message: 'seoTags not found' });
        }

        seoTags.title = title || seoTags.title;
        seoTags.meta_title = meta_title || seoTags.meta_title;
        seoTags.meta_description = meta_description || seoTags.meta_description;
        seoTags.meta_keywords = meta_keywords || seoTags.meta_keywords;

        await seoTags.save();
        res.json(seoTags);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete a seoTags by ID
router.delete('/:id', async (req, res) => {
    try {
        const seoTags = await SeoTag.findById(req.params.id);
        if (!seoTags) {
            return res.status(404).json({ message: 'SeoTag not found' });
        }

        await seoTags.deleteOne();
        res.json({ message: 'SeoTag deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
