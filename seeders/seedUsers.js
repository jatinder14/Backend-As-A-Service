const bcrypt = require('bcryptjs');
const User = require('../models/User');
const connectDB = require('../Database/connection');


const users = [
    {
        name: "admin",
        email: "admin@gmail.com",
        password: "password123",
        role: "admin"
    },
    {
        name: "sales",
        email: "sales@gmail.com",
        password: "password123",
        role: "sales"
    },
    {
        name: "hr",
        email: "hr@gmail.com",
        password: "password123",
        role: "hr"
    },
    {
        name: "ceo",
        email: "ceo@gmail.com",
        password: "password123",
        role: "ceo"
    },
    {
        name: "operations_manager",
        email: "operations_manager@gmail.com",
        password: "password123",
        role: "operations_manager"
    }
];

const seedUsers = async () => {
    try {
        connectDB();

        // Clear existing users
        // await User.deleteMany();
        // console.log('Existing users deleted');

        // Hash passwords and create new users
        for (let user of users) {
            await User.create(user);
            console.log(`User ${user.email} created`);
        }

        console.log('Users seeded successfully');
    } catch (err) {
        console.error('Error seeding users:', err);
        // process.exit(1);
    }
};

seedUsers();
module.exports = seedUsers
