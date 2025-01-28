const express = require('express');
const Blog = require('../models/Blog');
const { generateSignedUrl, getKey } = require('../utils/s3');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

// Get all blogs (with pagination, sorting, and filtering)
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10, sortBy = 'date', order = 'desc' } = req.query;
        const sortOrder = order === 'asc' ? 1 : -1;
        const totalBlogs = await Blog.countDocuments();

        const blogs = await Blog.find()
            .sort({ [sortBy]: sortOrder })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const blogsWithSignedUrls = await Promise.all(
            blogs.map(async (blog) => {
                const imagePromise = blog.image ? generateSignedUrl(getKey(blog.image)) : null;
                const videoPromise = blog.video ? generateSignedUrl(getKey(blog.video)) : null;

                const [videoSignedUrl, imagesSignedUrl] = await Promise.all([
                    videoPromise,
                    imagePromise
                ]);

                // Assign signed URLs back to the blog object
                blog.video = videoSignedUrl;
                blog.image = imagesSignedUrl;
                return blog;
            })
        );

        res.json({
            totalBlogs,
            currentPage: page,
            totalPages: Math.ceil(totalBlogs / limit),
            blogs: blogsWithSignedUrls
        }
        );
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get a single blog by ID (with error handling for non-existent ID)
router.get('/:id', async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        const imagePromise = blog.image ? generateSignedUrl(getKey(blog.image)) : null;
        const videoPromise = blog.video ? generateSignedUrl(getKey(blog.video)) : null;

        const [videoSignedUrl, imagesSignedUrl] = await Promise.all([
            videoPromise,
            imagePromise
        ]);

        // Assign signed URLs back to the blog object
        blog.video = videoSignedUrl;
        blog.image = imagesSignedUrl;
        res.json(blog);
    } catch (err) {
        res.status(500).json({ message: 'Invalid blog ID' });
    }
});

// Create a new blog
router.post('/', verifyToken, async (req, res) => {
    const { title, image, video, date, description } = req.body;

    try {
        const blog = new Blog({ title, image, video, date, description });
        await blog.save();
        res.status(201).json(blog);
    } catch (err) {
        res.status(500).json({ message: 'Error creating blog', error: err.message });
    }
});

// Update a blog by ID
router.put('/:id', verifyToken, async (req, res) => {
    const { title, image, video, date, description } = req.body;

    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        blog.title = title || blog.title;
        blog.image = image || blog.image;
        blog.video = video || blog.video;
        blog.date = date || blog.date;
        blog.description = description || blog.description;

        await blog.save();
        res.json(blog);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete a blog by ID
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        await blog.deleteOne();
        res.json({ message: 'Blog deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
