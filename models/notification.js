import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        event_type: {
            type: String,
            required: true,
            enum: [
                'order_creation',
                'order_delivery',
                'igm_status',
                'issue_created',
                'issue_closed',
                'agent-assigned',
                'out-for-delivery',
                'order-picked-up',
                'collector-recon',
            ],
        },
        details: {
            type: String,
            required: true,
        },
        is_seen: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
