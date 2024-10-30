const mongoose = require('mongoose');

const updateHistorySchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedAt: { type: Date, default: Date.now },
});

const taskSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        description: { type: String, required: true },
        listingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Listing',
            default: null,
        },
        assignedUsers: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
        ], // Reference to multiple users
        dueDate: { type: Date, required: true },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            immutable: true,
        },
        updatedBy: [updateHistorySchema],
        status: {
            type: String,
            enum: ['Pending', 'In Progress', 'Completed'],
            default: 'Pending',
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Task', taskSchema);
