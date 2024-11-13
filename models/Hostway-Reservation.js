const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({}, { strict: false });

module.exports = mongoose.model('Reservation', reservationSchema);
