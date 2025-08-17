const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
      minlength: [6, 'Password must be at least 6 characters long'],
    },
    role: {
      type: String,
      enum: {
        values: [
          'admin',
          'ceo',
          'sales',
          'onboarding',
          'operations_manager',
          'hr',
          'accounts',
          'inventory',
          'property_management',
          'customer',
        ],
        message:
          'Invalid role. Must be one of: admin, ceo, sales, onboarding, operations_manager, hr, accounts, inventory, property_management, customer',
      },
      default: 'customer',
    },
    position: {
      type: String,
      trim: true,
      maxlength: [100, 'Position cannot exceed 100 characters'],
    },
    dateOfJoining: {
      type: Date,
      validate: {
        validator: function (v) {
          return !v || v <= new Date();
        },
        message: 'Date of joining cannot be in the future',
      },
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number'],
    },
    emergencyContact: {
      type: String,
      trim: true,
      match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number'],
    },
    address: {
      type: String,
      trim: true,
      maxlength: [500, 'Address cannot exceed 500 characters'],
    },
    employmentType: {
      type: String,
      enum: {
        values: ['full-time', 'part-time', 'contract', 'intern'],
        message: 'Invalid employment type. Must be one of: full-time, part-time, contract, intern',
      },
      default: 'full-time',
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      validate: {
        validator: async function (v) {
          if (!v) return true;
          const manager = await mongoose.model('User').findById(v);
          return manager && ['admin', 'ceo', 'operations_manager', 'hr'].includes(manager.role);
        },
        message: 'Manager must be a valid user with appropriate role',
      },
    },
    // Subscription related fields
    currentSubscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
    },
    subscriptionStatus: {
      type: String,
      enum: {
        values: ['active', 'inactive', 'expired', 'cancelled'],
        message:
          'Invalid subscription status. Must be one of: active, inactive, expired, cancelled',
      },
      default: 'inactive',
    },
    subscriptionExpiryDate: {
      type: Date,
      validate: {
        validator: function (v) {
          return !v || v > new Date();
        },
        message: 'Subscription expiry date must be in the future',
      },
    },
    // Customer specific fields
    customerType: {
      type: String,
      enum: {
        values: ['individual', 'business', 'enterprise'],
        message: 'Invalid customer type. Must be one of: individual, business, enterprise',
      },
      default: 'individual',
    },
    companyName: {
      type: String,
      trim: true,
      maxlength: [100, 'Company name cannot exceed 100 characters'],
    },
    billingAddress: {
      street: {
        type: String,
        trim: true,
        maxlength: [200, 'Street address cannot exceed 200 characters'],
      },
      city: {
        type: String,
        trim: true,
        maxlength: [50, 'City cannot exceed 50 characters'],
      },
      state: {
        type: String,
        trim: true,
        maxlength: [50, 'State cannot exceed 50 characters'],
      },
      country: {
        type: String,
        trim: true,
        maxlength: [50, 'Country cannot exceed 50 characters'],
      },
      zipCode: {
        type: String,
        trim: true,
        maxlength: [20, 'Zip code cannot exceed 20 characters'],
      },
    },
    // Usage tracking
    usageStats: {
      propertiesCreated: {
        type: Number,
        default: 0,
        min: [0, 'Properties created cannot be negative'],
      },
      apiCallsUsed: {
        type: Number,
        default: 0,
        min: [0, 'API calls used cannot be negative'],
      },
      storageUsed: {
        type: Number,
        default: 0,
        min: [0, 'Storage used cannot be negative'],
      }, // in MB
      lastActivity: {
        type: Date,
        default: Date.now,
      },
    },
    // Additional fields for better user management
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    passwordChangedAt: {
      type: Date,
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for full name
UserSchema.virtual('fullName').get(function () {
  return this.name;
});

// Index for better query performance (email index is already created by unique: true)
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });

// Password hashing middleware - only hash if password is modified
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    this.passwordChangedAt = Date.now() - 1000; // Subtract 1 second to ensure token was created after password change
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check if password was changed after token was issued
UserSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Instance method to compare password
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Static method to find user by email with password
UserSchema.statics.findByEmailWithPassword = function (email) {
  return this.findOne({ email }).select('+password');
};

module.exports = mongoose.model('User', UserSchema);
