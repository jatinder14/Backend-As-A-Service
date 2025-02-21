const express = require('express');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { verifyToken, adminRole, hrOrAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

// Create or Update Daily Attendance
router.post('/', async (req, res) => {
    try {
        const userId = req.user?.id; // Ensure req.user is populated through middleware

        const { date, checkInTime, checkOutTime } = req.body;

        const attendanceDate = new Date(date);
        const attendance = await Attendance.findOne({ userId, date: attendanceDate });
        console.log("dfasdfasdf", attendance);

        // Check for overlapping attendance records
        if (attendance) {
            const overlappingCheckIns = attendance.dailyRecords[0].checkInTimes.filter(checkIn => {
                return new Date(checkIn) <= new Date(checkOutTime) && new Date(checkIn) >= new Date(checkInTime);
            });

            if (overlappingCheckIns.length > 0) {
                return res.status(400).json({ message: 'Overlapping check-in record exists for this date.' });
            }

            // Add the check-in and check-out times
            attendance.dailyRecords[0].checkInTimes.push(new Date(checkInTime));
            attendance.dailyRecords[0].checkOutTimes.push(new Date(checkOutTime));
            await attendance.save();

            return res.status(200).json({ message: 'Attendance updated successfully', attendance });
        } else {
            // Create new attendance record if none exists
            const newAttendance = new Attendance({
                userId,
                date: attendanceDate,
                checkInTimes: [new Date(checkInTime)],
                checkOutTimes: [new Date(checkOutTime)]
                // month: attendanceDate.toLocaleString('default', { month: 'long' }),
                // year: attendanceDate.getFullYear(),
                // totalDays: 1,
                // dailyRecords: [{
                // }]
            });
            await newAttendance.save();

            return res.status(201).json({ message: 'Attendance recorded successfully', newAttendance });
        }
    } catch (err) {
        console.error('Error creating/updating attendance:', err);
        res.status(500).json({ message: 'Error recording attendance', error: err.message });
    }
});

// Get Daily Attendance
router.get('/:date', async (req, res) => {
    const userId = req.user?.id;
    const attendanceDate = new Date(req.params.date);

    try {
        const attendance = await Attendance.findOne({ userId, 'dailyRecords.date': attendanceDate });

        if (!attendance) {
            return res.status(404).json({ message: 'No attendance record found for this date.' });
        }

        res.status(200).json(attendance.dailyRecords.find(record => record.date.toISOString() === attendanceDate.toISOString()));
    } catch (err) {
        console.error('Error fetching daily attendance:', err);
        res.status(500).json({ message: 'Error fetching daily attendance', error: err.message });
    }
});

// Get All Attendance Records for an Employee
router.get('', async (req, res) => {
    const userId = req.user?.id;

    try {
        const attendance = await Attendance.find({ userId }).populate('userId');

        if (!attendance.length) {
            return res.status(404).json({ message: 'No attendance records found for this employee.' });
        }

        res.status(200).json(attendance);
    } catch (err) {
        console.error('Error fetching attendance records:', err);
        res.status(500).json({ message: 'Error fetching attendance records', error: err.message });
    }
});

// Delete Daily Attendance Record
router.delete('/:date', async (req, res) => {
    const userId = req.user?.id;
    const attendanceDate = new Date(req.params.date);

    try {
        const attendance = await Attendance.findOne({ userId, 'dailyRecords.date': attendanceDate });

        if (!attendance) {
            return res.status(404).json({ message: 'No attendance record found for this date.' });
        }

        // Remove the daily record
        attendance.dailyRecords = attendance.dailyRecords.filter(record => record.date.toISOString() !== attendanceDate.toISOString());

        // If no records remain, you may want to delete the entire attendance document
        if (attendance.dailyRecords.length === 0) {
            await Attendance.deleteOne({ _id: attendance._id });
        } else {
            await attendance.save();
        }

        res.status(200).json({ message: 'Daily attendance record deleted successfully', attendance });
    } catch (err) {
        console.error('Error deleting daily attendance:', err);
        res.status(500).json({ message: 'Error deleting daily attendance', error: err.message });
    }
});

module.exports = router;
