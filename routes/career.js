const express = require('express');
const Career = require('../models/Career');
const { generateSignedUrl, getKey } = require('../utils/s3');
const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const career = new Career(req.body);
    await career.save();
    res.status(201).json({ message: 'Career created successfully', career });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const query = {};
    if (status) query.status = status;

    const totalCareers = await Career.countDocuments(query);
    const careers = await Career.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const careersWithSignedUrls = await Promise.all(
      careers.map(async career => {
        const resumePromise = career.resume ? generateSignedUrl(getKey(career.resume)) : null;

        const [resumeSignedUrl] = await Promise.all([resumePromise]);

        career.resume = resumeSignedUrl;

        return career;
      })
    );

    res.json({
      totalCareers,
      currentPage: page,
      totalPages: Math.ceil(totalCareers / limit),
      properties: careersWithSignedUrls,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    let career = await Career.findById(req.params.id);
    if (!career) return res.status(404).json({ message: 'Career not found' });

    const resumePromise = career.resume ? generateSignedUrl(getKey(career.resume)) : null;

    // Await all promises concurrently
    const [resumeSignedUrl] = await Promise.all([resumePromise]);

    // Assign the results to Career fields
    career.resume = resumeSignedUrl;

    res.status(200).json(career);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const career = await Career.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!career) return res.status(404).json({ message: 'Career not found' });
    res.status(200).json({ message: 'Career updated successfully', career });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const career = await Career.findByIdAndDelete(req.params.id);
    if (!career) return res.status(404).json({ message: 'Career not found' });
    res.status(200).json({ message: 'Career deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
