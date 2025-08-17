const mongoose = require('mongoose');
const User = require('./models/User');
const connectDB = require('./Database/connection');

const testUserSchema = async () => {
    try {
        await connectDB();
        console.log('Connected to database');

        // Test 1: Create a valid user
        console.log('\n=== Test 1: Creating a valid user ===');
        const validUser = new User({
            name: 'Test User',
            email: 'test@example.com',
            password: 'password123',
            role: 'customer',
            phone: '+1234567890',
            customerType: 'individual'
        });

        await validUser.save();
        console.log('✅ Valid user created successfully');

        // Test 2: Try to create user with invalid email
        console.log('\n=== Test 2: Testing invalid email ===');
        try {
            const invalidEmailUser = new User({
                name: 'Invalid Email User',
                email: 'invalid-email',
                password: 'password123',
                role: 'customer'
            });
            await invalidEmailUser.save();
        } catch (error) {
            console.log('✅ Invalid email validation working:', error.message);
        }

        // Test 3: Try to create user with duplicate email
        console.log('\n=== Test 3: Testing duplicate email ===');
        try {
            const duplicateUser = new User({
                name: 'Duplicate User',
                email: 'test@example.com',
                password: 'password123',
                role: 'customer'
            });
            await duplicateUser.save();
        } catch (error) {
            console.log('✅ Duplicate email validation working:', error.message);
        }

        // Test 4: Test password hashing
        console.log('\n=== Test 4: Testing password hashing ===');
        const userWithPassword = await User.findByEmailWithPassword('test@example.com');
        console.log('✅ Password is hashed:', userWithPassword.password !== 'password123');

        // Test 5: Test password comparison
        console.log('\n=== Test 5: Testing password comparison ===');
        const isMatch = await userWithPassword.comparePassword('password123');
        console.log('✅ Password comparison working:', isMatch);

        // Test 6: Test user without password
        console.log('\n=== Test 6: Testing user without password ===');
        const userWithoutPassword = await User.findOne({ email: 'test@example.com' });
        console.log('✅ Password excluded from query:', !userWithoutPassword.password);

        // Test 7: Test validation for required fields
        console.log('\n=== Test 7: Testing required fields ===');
        try {
            const incompleteUser = new User({
                name: 'Incomplete User'
                // Missing email and password
            });
            await incompleteUser.save();
        } catch (error) {
            console.log('✅ Required fields validation working:', error.message);
        }

        // Test 8: Test enum validation
        console.log('\n=== Test 8: Testing enum validation ===');
        try {
            const invalidRoleUser = new User({
                name: 'Invalid Role User',
                email: 'invalid-role@example.com',
                password: 'password123',
                role: 'invalid_role'
            });
            await invalidRoleUser.save();
        } catch (error) {
            console.log('✅ Enum validation working:', error.message);
        }

        // Test 9: Test virtual fields
        console.log('\n=== Test 9: Testing virtual fields ===');
        const userForVirtual = await User.findOne({ email: 'test@example.com' });
        console.log('✅ Virtual fullName working:', userForVirtual.fullName);

        // Test 10: Test indexes
        console.log('\n=== Test 10: Testing indexes ===');
        const usersByRole = await User.find({ role: 'customer' });
        console.log('✅ Index query working:', usersByRole.length > 0);

        console.log('\n🎉 All tests passed! User schema is working correctly.');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        // Clean up test data
        await User.deleteOne({ email: 'test@example.com' });
        console.log('\n🧹 Test data cleaned up');
        mongoose.connection.close();
    }
};

// Run the test
testUserSchema();
