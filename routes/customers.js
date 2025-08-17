const express = require('express');
const Customer = require('../models/Customer');
const router = express.Router();

// Get all customers (with pagination, sorting, and error handling)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = 'name' } = req.query;
    const customers = await Customer.find()
      .sort(sortBy)
      .limit(limit * 1)
      .skip((page - 1) * limit);
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a single customer by ID (with error handling for non-existent ID)
router.get('/:id', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.json(customer);
  } catch {
    res.status(500).json({ message: 'Invalid customer ID' });
  }
});

// Create a new customer (with duplicate email check)
router.post('/', async (req, res) => {
  const { name, email, phone, address, preferences, bookingHistory } = req.body;

  try {
    const existingCustomer = await Customer.findOne({ email });
    if (existingCustomer) {
      return res.status(400).json({ message: 'Customer with this email already exists' });
    }

    const customer = new Customer({ name, email, phone, address, preferences, bookingHistory });
    await customer.save();
    res.status(201).json(customer);
  } catch (err) {
    res.status(500).json({ message: 'Error creating customer', error: err.message });
  }
});

// Update a customer (with validation and existence check)
router.put('/:id', async (req, res) => {
  const { name, email, phone, address, preferences } = req.body;

  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (email && email !== customer.email) {
      const emailExists = await Customer.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

    customer.name = name || customer.name;
    customer.email = email || customer.email;
    customer.phone = phone || customer.phone;
    customer.address = address || customer.address;
    customer.preferences = preferences || customer.preferences;

    await customer.save();
    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete a customer (with existence check)
router.delete('/:id', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    await customer.deleteOne();
    res.json({ message: 'Customer deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
