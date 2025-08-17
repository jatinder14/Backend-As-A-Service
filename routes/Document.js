const express = require('express');
const Document = require('../models/Document');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');
const { ERROR_MESSAGES } = require('../constants/eroorMessaages');

const router = express.Router();

router.use(verifyToken);

router.post('/:employeeId', async (req, res) => {
  const { employeeId } = req.params;
  const { emiratesId, passportCopy, labourCard, visaCopy } = req.body;

  try {
    const user = await User.findById(employeeId);
    if (!user) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    let document = await Document.findOne({ employeeId });

    // Update document if it exists, otherwise create a new one
    if (document) {
      document.emiratesId = emiratesId || document.emiratesId;
      document.passportCopy = passportCopy || document.passportCopy;
      document.labourCard = labourCard || document.labourCard;
      document.visaCopy = visaCopy || document.visaCopy;
      await document.save();
      res.status(200).json({ message: 'Document updated successfully', document });
    } else {
      document = new Document({ employeeId, emiratesId, passportCopy, labourCard, visaCopy });
      await document.save();
      res.status(201).json({ message: 'Document created successfully', document });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error processing document', error: err.message });
  }
});

router.get('/fetchAllDocuments', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const totalDocuments = await Document.countDocuments();

    const Documents = await Document.find()
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 })
      .exec();

    res.json({
      totalDocuments,
      currentPage: page,
      totalPages: Math.ceil(totalDocuments / limit),
      Documents,
    });
  } catch (err) {
    res.status(500).json({ message: ERROR_MESSAGES.ERROR_FETCHING_TASKS, error: err.message });
  }
});

router.get('/:employeeId', async (req, res) => {
  const { employeeId } = req.params;
  try {
    const document = await Document.findOne({ employeeId }).populate('employeeId');
    if (!document) {
      return res.status(404).json({ message: 'Document not found for this employee.' });
    }
    res.status(200).json(document);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching document', error: err.message });
  }
});

router.put('/:employeeId', async (req, res) => {
  const { employeeId } = req.params;
  const { emiratesId, passportCopy, labourCard, visaCopy } = req.body;

  try {
    const user = await User.findById(employeeId);
    if (!user) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const document = await Document.findOneAndUpdate(
      { employeeId },
      { emiratesId, passportCopy, labourCard, visaCopy },
      { new: true, runValidators: true }
    );

    if (!document) {
      return res.status(404).json({ message: 'Document not found for this employee.' });
    }

    res.status(200).json({ message: 'Document updated successfully', document });
  } catch (err) {
    res.status(500).json({ message: 'Error updating document', error: err.message });
  }
});

router.delete('/:employeeId', async (req, res) => {
  const { employeeId } = req.params;
  const { fields } = req.body; // Fields to delete in the document

  try {
    const document = await Document.findOne({ employeeId });
    if (!document) {
      return res.status(404).json({ message: 'Document not found for this employee.' });
    }

    fields.forEach(field => {
      if (document[field] !== undefined) {
        document[field] = undefined; // Set to undefined to delete the field
      }
    });

    await document.save();
    res.status(200).json({ message: 'Document fields deleted successfully', document });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting document fields', error: err.message });
  }
});

module.exports = router;
