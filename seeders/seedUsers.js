const User = require('../models/User');
const connectDB = require('../Database/connection');

const users = [
  {
    name: 'Admin User',
    email: 'admin@gmail.com',
    password: 'password123',
    role: 'admin',
    position: 'System Administrator',
    employmentType: 'full-time',
    isActive: true,
  },
  {
    name: 'Sales Manager',
    email: 'sales@gmail.com',
    password: 'password123',
    role: 'sales',
    position: 'Sales Manager',
    employmentType: 'full-time',
    isActive: true,
  },
  {
    name: 'HR Manager',
    email: 'hr@gmail.com',
    password: 'password123',
    role: 'hr',
    position: 'Human Resources Manager',
    employmentType: 'full-time',
    isActive: true,
  },
  {
    name: 'CEO',
    email: 'ceo@gmail.com',
    password: 'password123',
    role: 'ceo',
    position: 'Chief Executive Officer',
    employmentType: 'full-time',
    isActive: true,
  },
  {
    name: 'Operations Manager',
    email: 'operations_manager@gmail.com',
    password: 'password123',
    role: 'operations_manager',
    position: 'Operations Manager',
    employmentType: 'full-time',
    isActive: true,
  },
  {
    name: 'Test Customer',
    email: 'customer@gmail.com',
    password: 'password123',
    role: 'customer',
    customerType: 'individual',
    isActive: true,
  },
];

const seedUsers = async () => {
  try {
    await connectDB();

    // Clear existing users (optional - uncomment if needed)
    // await User.deleteMany();
    // console.log('Existing users deleted');

    // Create new users (password will be hashed by pre-save middleware)
    for (let userData of users) {
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        await User.create(userData);
        console.log(`User ${userData.email} created successfully`);
      } else {
        console.log(`User ${userData.email} already exists, skipping...`);
      }
    }

    console.log('Users seeding completed successfully');
  } catch (err) {
    console.error('Error seeding users:', err);
    if (err.name === 'ValidationError') {
      console.error(
        'Validation errors:',
        Object.values(err.errors).map(e => e.message)
      );
    }
  }
};

// Only run if this file is executed directly
if (require.main === module) {
  seedUsers()
    .then(() => {
      console.log('Seeding process completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('Seeding process failed:', err);
      process.exit(1);
    });
}

module.exports = seedUsers;
