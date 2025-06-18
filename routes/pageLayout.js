const express = require('express');
const router = express.Router();
const PageLayout = require('../models/PageLayout');

// CREATE
router.post('/', async (req, res) => {
    try {
        const { name, layoutJson } = req.body;
        const page = await PageLayout.create({ name, layoutJson });
        res.status(201).json(page);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// READ ALL
router.get('/', async (req, res) => {
    try {
        const pages = await PageLayout.find().sort({ createdAt: -1 });
        res.json(pages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// READ ONE
router.get('/:id', async (req, res) => {
    try {
        const page = await PageLayout.findById(req.params.id);
        if (!page) return res.status(404).json({ error: 'Page not found' });
        res.json(page);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE
router.put('/:id', async (req, res) => {
    try {
        const { name, layoutJson } = req.body;
        const updated = await PageLayout.findByIdAndUpdate(
            req.params.id,
            { name, layoutJson },
            { new: true }
        );
        if (!updated) return res.status(404).json({ error: 'Page not found' });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await PageLayout.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'Page not found' });
        res.json({ message: 'Page deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
