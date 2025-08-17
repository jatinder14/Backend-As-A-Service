const express = require('express');
const Project = require('../models/Project');
const { generateSignedUrl, getKey } = require('../utils/s3');
const router = express.Router();

// Get all projects (with pagination, sorting, and filtering)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = 'date', order = 'desc' } = req.query;
    const sortOrder = order === 'asc' ? 1 : -1;
    const totalProjects = await Project.countDocuments();

    const projects = await Project.find()
      .sort({ [sortBy]: sortOrder })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const projectsWithSignedUrls = await Promise.all(
      projects.map(async project => {
        const imagePromise = project.image ? generateSignedUrl(getKey(project.image)) : null;
        const videoPromise = project.video ? generateSignedUrl(getKey(project.video)) : null;

        const [videoSignedUrl, imagesSignedUrl] = await Promise.all([videoPromise, imagePromise]);

        // Assign signed URLs back to the project object
        project.video = videoSignedUrl;
        project.image = imagesSignedUrl;
        return project;
      })
    );

    res.json({
      totalProjects,
      currentPage: page,
      totalPages: Math.ceil(totalProjects / limit),
      projects: projectsWithSignedUrls,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a single project by ID (with error handling for non-existent ID)
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const imagePromise = project.image ? generateSignedUrl(getKey(project.image)) : null;
    const videoPromise = project.video ? generateSignedUrl(getKey(project.video)) : null;

    const [videoSignedUrl, imagesSignedUrl] = await Promise.all([videoPromise, imagePromise]);

    // Assign signed URLs back to the project object
    project.video = videoSignedUrl;
    project.image = imagesSignedUrl;
    res.json(project);
  } catch {
    res.status(500).json({ message: 'Invalid project ID' });
  }
});

// Create a new project
router.post('/', async (req, res) => {
  const { title, image, video, date, description } = req.body;

  try {
    const project = new Project({ title, image, video, date, description });
    await project.save();
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ message: 'Error creating project', error: err.message });
  }
});

// Update a project by ID
router.put('/:id', async (req, res) => {
  const { title, image, video, date, description } = req.body;

  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    project.title = title || project.title;
    project.image = image || project.image;
    project.video = video || project.video;
    project.date = date || project.date;
    project.description = description || project.description;

    await project.save();
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete a project by ID
router.delete('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    await project.deleteOne();
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
