const express = require('express');
const Property = require('../models/Property');
const router = express.Router();

// Get all properties (with pagination, sorting, and filtering by location)
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10, sortBy = 'propertyName', location } = req.query;
        const query = location ? { location } : {};
        const properties = await Property.find(query)
            .sort(sortBy)
            .limit(limit * 1)
            .skip((page - 1) * limit);
        res.json(properties);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get a single property by ID (with error handling)
router.get('/:id', async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        if (!property) {
            return res.status(404).json({ message: 'Property not found' });
        }
        res.json(property);
    } catch (err) {
        res.status(500).json({ message: 'Invalid property ID' });
    }
});

// Create a new property (with propertyId check)
router.post('/', async (req, res) => {
    const {
        propertyId, propertyName, location, type, pricing, features, 
        maintenanceHistory, propertyOwner, status, paymentDue, ejariExpiryDate, 
        paymentDueDate, addendum, bankAccount, chequeCopies
    } = req.body;

    try {
        const existingProperty = await Property.findOne({ propertyId });
        if (existingProperty) {
            return res.status(400).json({ message: 'Property with this ID already exists' });
        }

        const property = new Property({
            propertyId, propertyName, location, type, pricing, features, 
            maintenanceHistory, propertyOwner, status, paymentDue, ejariExpiryDate, 
            paymentDueDate, addendum, bankAccount, chequeCopies
        });
        await property.save();
        res.status(201).json(property);
    } catch (err) {
        res.status(500).json({ message: 'Error creating property', error: err.message });
    }
});

// Update a property (with validation and existence check)
router.put('/:id', async (req, res) => {
    const {
        propertyId, propertyName, location, type, pricing, features, 
        maintenanceHistory, propertyOwner, status, paymentDue, ejariExpiryDate, 
        paymentDueDate, addendum, bankAccount, chequeCopies
    } = req.body;

    try {
        const property = await Property.findById(req.params.id);
        if (!property) {
            return res.status(404).json({ message: 'Property not found' });
        }

        if (propertyId && propertyId !== property.propertyId) {
            const propertyExists = await Property.findOne({ propertyId });
            if (propertyExists) {
                return res.status(400).json({ message: 'Property ID already in use' });
            }
        }

        property.propertyId = propertyId || property.propertyId;
        property.propertyName = propertyName || property.propertyName;
        property.location = location || property.location;
        property.type = type || property.type;
        property.pricing = pricing || property.pricing;
        property.features = features || property.features;
        property.maintenanceHistory = maintenanceHistory || property.maintenanceHistory;
        property.propertyOwner = propertyOwner || property.propertyOwner;
        property.status = status || property.status;
        property.paymentDue = paymentDue || property.paymentDue;
        property.ejariExpiryDate = ejariExpiryDate || property.ejariExpiryDate;
        property.paymentDueDate = paymentDueDate || property.paymentDueDate;
        property.addendum = addendum || property.addendum;
        property.bankAccount = bankAccount || property.bankAccount;
        property.chequeCopies = chequeCopies || property.chequeCopies;

        await property.save();
        res.json(property);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete a property (with existence check)
router.delete('/:id', async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        if (!property) {
            return res.status(404).json({ message: 'Property not found' });
        }

        await property.deleteOne();
        res.json({ message: 'Property deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
