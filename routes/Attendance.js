const express = require('express');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { verifyToken, adminRole, hrOrAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

router.post('/checkin', async (req, res) => {
  try {
    const { checkInTime } = req.body;
    const userId = req.user.id;

    const checkInDate = new Date(checkInTime);
    checkInDate.setHours(0, 0, 0, 0); // Normalize time to start of the day
    console.log(new Date(checkInTime), checkInDate);

    // Find attendance where any check-in time is within the same day
    let attendance = await Attendance.findOne({
      userId,
      checkInTimes: {
        $elemMatch: {
          $gte: checkInDate, // Start of the day
          $lt: new Date(checkInDate.getTime() + 86400000), // Start of the next day
        },
      },
    });

    console.log(attendance);
    if (attendance) {
      const lastCheckInIndex = attendance.checkInTimes.length - 1;

      if (attendance.checkOutTimes.length <= lastCheckInIndex) {
        return res.status(400).json({
          success: false,
          message: 'You must check out before checking in again.',
        });
      }
      attendance.checkInTimes.push(new Date(checkInTime));
    } else {
      attendance = new Attendance({
        userId,
        checkInTimes: [new Date(checkInTime)],
        checkOutTimes: [],
      });
    }

    await attendance.save();
    res.status(201).json({ success: true, data: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/checkout', async (req, res) => {
  try {
    const { checkOutTime } = req.body;
    const userId = req.user.id;

    // Normalize check-out date to start of the day
    const checkOutDate = new Date(checkOutTime);
    checkOutDate.setHours(0, 0, 0, 0);

    // Find today's attendance entry
    let attendance = await Attendance.findOne({
      userId,
      checkInTimes: {
        $elemMatch: {
          $gte: checkOutDate,
          $lt: new Date(checkOutDate.getTime() + 86400000),
        },
      },
    });

    if (!attendance) {
      return res.status(400).json({
        success: false,
        message: 'No check-in found for today, please check in first.',
      });
    }

    // Find last check-in index
    const lastCheckInIndex = attendance.checkInTimes.length - 1;

    // Check if already checked out for the last check-in
    if (attendance.checkOutTimes.length > lastCheckInIndex) {
      return res.status(400).json({
        success: false,
        message: 'You have already checked out for your last check-in.',
      });
    }

    // Add check-out time at the same index as last check-in
    attendance.checkOutTimes[lastCheckInIndex] = new Date(checkOutTime);

    // Save the updated attendance record
    await attendance.save();

    res.status(200).json({ success: true, data: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/all', async (req, res) => {
  try {
    const userId = req.user.id;
    let { startDate, endDate } = req.query;

    let query = { userId };

    if (startDate && endDate) {
      startDate = new Date(startDate).setHours(0, 0, 0, 0);
      endDate = new Date(endDate).setHours(23, 59, 59, 999);

      if (startDate > endDate) {
        return res.status(400).json({
          success: false,
          message: 'startDate cannot be greater than endDate.',
        });
      }

      query.checkInTimes = { $elemMatch: { $gte: new Date(startDate), $lte: new Date(endDate) } };
    }

    const attendanceRecords = await Attendance.find(query).sort({ checkInTimes: -1 });

    res.status(200).json({ success: true, data: attendanceRecords });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:date', async (req, res) => {
  try {
    const userId = req.user.id;
    const queryDate = new Date(req.params.date);

    // Normalize date to start of the day
    queryDate.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      userId,
      checkInTimes: {
        $elemMatch: {
          $gte: queryDate,
          $lt: new Date(queryDate.getTime() + 86400000),
        },
      },
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'No attendance found for this date.',
      });
    }

    res.status(200).json({ success: true, data: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/update-by-date', async (req, res) => {
  try {
    const { date, checkInTimes, checkOutTimes } = req.body;
    const userId = req.user.id;

    if (!date) {
      return res.status(400).json({ success: false, message: 'Date is required.' });
    }

    const checkInDate = new Date(date);
    checkInDate.setHours(0, 0, 0, 0); // Normalize to start of the day
    const nextDay = new Date(checkInDate.getTime() + 86400000); // Next day's start

    let attendance = await Attendance.findOne({
      userId,
      checkInTimes: { $gte: checkInDate, $lt: nextDay },
    });

    if (!attendance) {
      return res
        .status(404)
        .json({ success: false, message: 'No attendance found for this date.' });
    }

    if (!Array.isArray(checkInTimes) || !Array.isArray(checkOutTimes)) {
      return res
        .status(400)
        .json({ success: false, message: 'checkInTimes and checkOutTimes must be arrays.' });
    }

    if (checkInTimes.length !== checkOutTimes.length) {
      return res
        .status(400)
        .json({ success: false, message: 'Each check-in must have a corresponding check-out.' });
    }

    // Validate that all check-in and check-out times are within the same day
    for (let time of [...checkInTimes, ...checkOutTimes]) {
      const timeDate = new Date(time);
      if (timeDate < checkInDate || timeDate >= nextDay) {
        return res.status(400).json({
          success: false,
          message: 'All check-in and check-out times must belong to the same date as the record.',
          incorrectEntry: timeDate,
        });
      }
    }

    // Overwrite existing check-in and check-out times
    attendance.checkInTimes = checkInTimes.map(time => new Date(time));
    attendance.checkOutTimes = checkOutTimes.map(time => new Date(time));

    await attendance.save();

    res.status(200).json({ success: true, data: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:date', async (req, res) => {
  try {
    const date = req.params.date;
    const userId = req.user.id;

    if (!date) {
      return res.status(400).json({ success: false, message: 'Date is required.' });
    }

    const deleteDate = new Date(date);
    deleteDate.setHours(0, 0, 0, 0); // Normalize time to start of the day

    const attendance = await Attendance.findOneAndDelete({
      userId,
      checkInTimes: { $gte: deleteDate, $lt: new Date(deleteDate.getTime() + 86400000) },
    });

    if (!attendance) {
      return res
        .status(404)
        .json({ success: false, message: 'No attendance record found for this date.' });
    }

    res.status(200).json({ success: true, message: 'Attendance record deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
