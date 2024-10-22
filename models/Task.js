const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    listingId: { type: Number, ref: 'Listing', required: true },  // Reference to Property
    assignedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }], // Reference to multiple users
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' }
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
