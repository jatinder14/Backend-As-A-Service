const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  event_type: {
    type: String,
    required: true,
    // enum: ['LEAD_CREATED', 'LEAD_UPDATED', 'LEAVE_CREATED', 'LEAVE_UPDATED', 'TASK_CREATED', 'TASK_UPDATED'],
  },
  details: {
    type: Object,
    required: true,
  },
  is_seen: {
    type: Boolean,
    default: false,
  },
  notify_users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Reference to multiple users
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
