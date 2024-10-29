const express = require('express');
const Salary = require('../models/salary');
const User = require('../models/User');
const { verifyToken, adminRole, hrOrAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken, hrOrAdmin);

router.post('/:employeeId', async (req, res) => {
    const { employeeId } = req.params;
    const { startDate, endDate, baseSalary, allowances = 0, deductions = 0 } = req.body;

    try {
        const user = await User.findById(employeeId);
        if (!user) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (!startDate || !endDate || isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ message: 'Invalid date format' });
        }

        if (end <= start) {
            return res.status(400).json({ message: 'End date must be greater than start date' });
        }

        const salary = await Salary.findOne({ employeeId }) || new Salary({ employeeId });

        // Check for overlapping periods
        const overlappingPeriod = salary.payPeriod.find(period =>
            (start >= period.startDate && start <= period.endDate) ||
            (end >= period.startDate && end <= period.endDate)
        );

        if (overlappingPeriod) {
            return res.status(400).json({ message: 'Overlapping pay period exists.' });
        }

        // Add new pay period
        salary.payPeriod.push({ startDate: start, endDate: end, baseSalary, allowances, deductions });
        await salary.save();

        res.status(201).json({ message: 'Pay period added successfully', salary });
    } catch (err) {
        res.status(500).json({ message: 'Error adding pay period', error: err.message });
    }
});


// Update a Salary Pay Period for an Employee
router.put('/:employeeId', async (req, res) => {
    const { startDate, endDate, baseSalary, allowances, deductions } = req.body;
    const employeeId = req.params.employeeId;

    // Validate input
    if (!startDate || !endDate || (baseSalary === undefined && allowances === undefined && deductions === undefined)) {
        return res.status(400).json({ message: 'Start date, end date, and at least one salary detail to update are required.' });
    }

    try {
        const salary = await Salary.findOne({ employeeId });
        if (!salary) {
            return res.status(404).json({ message: 'Salary record not found for this employee.' });
        }

        // Find the pay period to update
        const payPeriodIndex = salary.payPeriod.findIndex(period =>
            period.startDate.toISOString() === new Date(startDate).toISOString() &&
            period.endDate.toISOString() === new Date(endDate).toISOString()
        );

        // Check if the pay period exists
        if (payPeriodIndex === -1) {
            return res.status(404).json({ message: 'Specified pay period not found.' });
        }

        // Update the salary details
        if (baseSalary !== undefined) salary.payPeriod[payPeriodIndex].baseSalary = baseSalary;
        if (allowances !== undefined) salary.payPeriod[payPeriodIndex].allowances = allowances;
        if (deductions !== undefined) salary.payPeriod[payPeriodIndex].deductions = deductions;

        // Save the updated salary record
        await salary.save();

        // Return the updated salary record
        res.status(200).json({ message: 'Pay period updated successfully', salary });
    } catch (err) {
        console.error('Error updating pay period:', err); // Log error for debugging
        res.status(500).json({ message: 'Error updating pay period', error: err.message });
    }
});



// Get Salary Details
router.get('/:employeeId', async (req, res) => {
    const { employeeId } = req.params;

    try {
        const salary = await Salary.findOne({ employeeId }).populate('employeeId');

        if (!salary) {
            return res.status(404).json({ message: 'Salary record not found' });
        }

        const salaryResponse = {
            ...salary.toObject(),
            employee: salary.employeeId, // Rename the populated field
        };
        delete salaryResponse.employeeId; // Remove original field

        res.status(200).json(salaryResponse);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching salary details', error: err.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;

        const totalSalaries = await Salary.countDocuments();

        const salaries = await Salary.find().populate('employeeId')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec()

        // Adjust each salary object to rename `employeeId` to `employee`
        const salariesResponse = salaries.map(salary => {
            const salaryObj = salary.toObject();
            salaryObj.employee = salaryObj.employeeId; // Rename populated field
            delete salaryObj.employeeId; // Remove original field
            return salaryObj;
        });

        res.status(200).json({
            totalSalaries,
            currentPage: page,
            totalPages: Math.ceil(totalSalaries / limit),
            salariesResponse
        });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching all salary details', error: err.message });
    }
});

// Delete a Salary Pay Period for an Employee
router.delete('/:employeeId', async (req, res) => {
    const { startDate, endDate } = req.body;
    const employeeId = req.params.employeeId;

    // Validate input
    if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Both start date and end date are required.' });
    }

    try {
        const salary = await Salary.findOne({ employeeId });
        if (!salary) {
            return res.status(404).json({ message: 'Salary record not found for this employee.' });
        }

        // Parse the dates for comparison
        const parsedStartDate = new Date(startDate);
        const parsedEndDate = new Date(endDate);

        // Filter out the pay period to be deleted
        const updatedPayPeriods = salary.payPeriod.filter(period =>
            !(period.startDate.toISOString() === parsedStartDate.toISOString() &&
                period.endDate.toISOString() === parsedEndDate.toISOString())
        );

        // Check if any period was removed
        if (updatedPayPeriods.length === salary.payPeriod.length) {
            return res.status(404).json({ message: 'Specified pay period not found.' });
        }

        // Update the payPeriod array and save
        salary.payPeriod = updatedPayPeriods;
        await salary.save();

        // Response includes updated salary data
        res.status(200).json({ message: 'Pay period deleted successfully', salary });
    } catch (err) {
        console.error('Error deleting pay period:', err); // Log error for debugging
        res.status(500).json({ message: 'Error deleting pay period', error: err.message });
    }
});


module.exports = router;