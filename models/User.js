const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    role: {
        type: String,
        enum: ['admin', 'ceo', 'sales', 'onboarding', 'operations_manager', 'hr', 'accounts', 'inventory', 'property_management'],
        default: 'admin'
    },
    position: { type: String }, // Job title
    dateOfJoining: { type: Date },
    phone: { type: String },
    emergencyContact: { type: String },
    address: { type: String },
    employmentType: {
        type: String,
        enum: ['full-time', 'part-time', 'contract', 'intern'],
        default: 'full-time'
    },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

// Password hashing middleware
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    // console.log("this",this.isModified('password'))
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

module.exports = mongoose.model('User', UserSchema);
