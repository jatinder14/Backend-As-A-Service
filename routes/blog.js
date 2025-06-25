const express = require('express');
const Blog = require('../models/Blog');
const { generateSignedUrl, getKey } = require('../utils/s3');
const { isValidObjectId } = require('mongoose');
const router = express.Router();
const { verifyToken, adminRole, hrOrAdmin } = require('../middleware/auth');

// Get all blogs (with pagination, sorting, and filtering)
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10, sortBy = 'date', order = 'desc', domain } = req.query;
        const sortOrder = order === 'asc' ? 1 : -1;
        let filter = {}

        if (domain)
            filter.domain = domain

        const totalBlogs = await Blog.countDocuments(filter);

        const blogs = await Blog.find(filter)
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
router.get('/:idOrSlug', async (req, res) => {
    try {
        const { idOrSlug } = req.params;
        let blog;

        if (isValidObjectId(idOrSlug)) {
            blog = await Blog.findById(idOrSlug);
        }

        // If not found by ID or if not a valid ObjectId, try slug
        if (!blog) {
            blog = await Blog.findOne({ slug: idOrSlug });
        }

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
        res.status(500).json({ message: 'Invalid blog ID', error: err.message });
    }
});

router.use(verifyToken, adminRole);

// Create a new blog
router.post('/', async (req, res) => {
    const { title, image, video, date, description, domain, SubTitleAndContent, metaData, shortDescription, author } = req.body;

    try {
        const blog = new Blog({ title, image, video, date, description, domain, SubTitleAndContent, metaData, shortDescription, author });

        blog.createdBy = req.user?.id;

        await blog.save();
        await blog.populate('createdBy');

        res.status(201).json(blog);
    } catch (err) {
        res.status(500).json({ message: 'Error creating blog', error: err.message });
    }
});

// Update a blog by ID
router.put('/:id', async (req, res) => {
    const { title, image, video, date, description, domain, SubTitleAndContent, metaData, shortDescription, author, slug } = req.body;

    try {

        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }
        blog.updatedBy = req.user?.id;

        blog.title = title || blog.title;
        blog.slug = slug || blog.slug;
        blog.image = image || blog.image;
        blog.video = video || blog.video;
        blog.date = date || blog.date;
        blog.description = description || blog.description;
        blog.SubTitleAndContent = SubTitleAndContent || blog.SubTitleAndContent;
        blog.domain = domain || blog.domain;
        blog.metaData = metaData || blog.metaData;
        blog.shortDescription = shortDescription || blog.shortDescription;
        blog.author = author || blog.author;

        await blog.save();
        await blog.populate([{ path: 'createdBy' }, { path: 'updatedBy' }]);

        res.json(blog);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete a blog by ID
router.delete('/:id', async (req, res) => {
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
