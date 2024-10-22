const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// User Schema
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['admin', 'sales', 'onboarding', 'operations', 'hr', 'accounts', 'inventory', 'property_management'],
        default: 'admin'
    }
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
