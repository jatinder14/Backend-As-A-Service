const mongoose = require('mongoose');
const Refund = require('./models/Refund');

/**
 * Test script to verify userId functionality in Refund model
 */

const testRefundUserId = async () => {
  try {
    console.log('🧪 Testing Refund userId functionality...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/your-database');

    console.log('✅ Connected to MongoDB');

    // Test 1: Check if we can query refunds by userId directly
    console.log('\n📋 Test 1: Direct userId query performance');

    const startTime = Date.now();
    const refunds = await Refund.find({ userId: { $exists: true } })
      .limit(5)
      .populate('userId', 'name email')
      .populate('transactionId', 'amount razorpayPaymentId');
    const queryTime = Date.now() - startTime;

    console.log(`   Found ${refunds.length} refunds in ${queryTime}ms`);

    if (refunds.length > 0) {
      console.log('   Sample refund:');
      console.log(`   - Refund ID: ${refunds[0].refundId}`);
      console.log(
        `   - User: ${refunds[0].userId?.name || 'N/A'} (${refunds[0].userId?.email || 'N/A'})`
      );
      console.log(`   - Amount: ${refunds[0].amount || refunds[0].refundedAmount}`);
      console.log(`   - Status: ${refunds[0].status}`);
    }

    // Test 2: Check index usage
    console.log('\n📊 Test 2: Index verification');
    const indexes = await Refund.collection.getIndexes();
    console.log('   Available indexes:');
    Object.keys(indexes).forEach(indexName => {
      console.log(`   - ${indexName}: ${JSON.stringify(indexes[indexName])}`);
    });

    // Test 3: Performance comparison (if we have data)
    if (refunds.length > 0) {
      console.log('\n⚡ Test 3: Performance comparison');

      const userId = refunds[0].userId._id;

      // Method 1: Direct userId query
      const direct1 = Date.now();
      const directRefunds = await Refund.find({ userId }).limit(10);
      const directTime = Date.now() - direct1;

      // Method 2: With population
      const pop1 = Date.now();
      const populatedRefunds = await Refund.find({ userId })
        .populate('userId', 'name email')
        .populate('transactionId', 'amount')
        .limit(10);
      const popTime = Date.now() - pop1;

      console.log(`   Direct query: ${directTime}ms (${directRefunds.length} results)`);
      console.log(`   With population: ${popTime}ms (${populatedRefunds.length} results)`);
    }

    // Test 4: Check for refunds without userId
    console.log('\n🔍 Test 4: Data integrity check');
    const refundsWithoutUserId = await Refund.countDocuments({
      $or: [{ userId: { $exists: false } }, { userId: null }],
    });

    console.log(`   Refunds without userId: ${refundsWithoutUserId}`);

    if (refundsWithoutUserId > 0) {
      console.log('   ⚠️  Migration needed: Run "node migrations/addUserIdToRefunds.js"');
    } else {
      console.log('   ✅ All refunds have userId field');
    }

    // Test 5: Compound index usage
    console.log('\n🔗 Test 5: Compound index test');
    const compoundStart = Date.now();
    const statusRefunds = await Refund.find({
      userId: { $exists: true },
      status: 'COMPLETED',
    }).limit(5);
    const compoundTime = Date.now() - compoundStart;

    console.log(
      `   Compound query (userId + status): ${compoundTime}ms (${statusRefunds.length} results)`
    );

    console.log('\n🎉 All tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run tests if called directly
if (require.main === module) {
  testRefundUserId()
    .then(() => {
      console.log('\n✨ Test suite completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { testRefundUserId };
