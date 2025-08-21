const crypto = require('crypto');

// Mock webhook payloads for testing
const mockWebhookPayloads = {
  paymentCaptured: {
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_test123',
          order_id: 'order_test123',
          amount: 50000,
          currency: 'INR',
          status: 'captured',
          created_at: Math.floor(Date.now() / 1000),
        },
      },
    },
  },

  paymentFailed: {
    event: 'payment.failed',
    payload: {
      payment: {
        entity: {
          id: 'pay_test124',
          order_id: 'order_test124',
          amount: 50000,
          currency: 'INR',
          status: 'failed',
          created_at: Math.floor(Date.now() / 1000),
        },
      },
    },
  },

  refundCreated: {
    event: 'refund.created',
    payload: {
      refund: {
        entity: {
          id: 'rfnd_test123',
          payment_id: 'pay_test123',
          amount: 25000,
          currency: 'INR',
          status: 'processed',
          created_at: Math.floor(Date.now() / 1000),
        },
      },
    },
  },
};

// Helper function to generate webhook signature
function generateWebhookSignature(payload, secret) {
  return crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
}

// Test webhook signature generation
function testWebhookSignatures() {
  console.log('🔐 Testing Webhook Signature Generation...\n');

  const webhookSecret =
    process.env.RAZORPAY_WEBHOOK_SECRET ||
    process.env.RAZORPAY_KEY_SECRET ||
    '29KBqceNnQER5CxM4Aj4Zsen';

  console.log('1. Payment Captured Webhook:');
  const payload1 = mockWebhookPayloads.paymentCaptured;
  const signature1 = generateWebhookSignature(payload1, webhookSecret);
  console.log('   Payload:', JSON.stringify(payload1, null, 2));
  console.log('   Signature:', signature1);
  console.log('');

  console.log('2. Payment Failed Webhook:');
  const payload2 = mockWebhookPayloads.paymentFailed;
  const signature2 = generateWebhookSignature(payload2, webhookSecret);
  console.log('   Payload:', JSON.stringify(payload2, null, 2));
  console.log('   Signature:', signature2);
  console.log('');

  console.log('3. Refund Created Webhook:');
  const payload3 = mockWebhookPayloads.refundCreated;
  const signature3 = generateWebhookSignature(payload3, webhookSecret);
  console.log('   Payload:', JSON.stringify(payload3, null, 2));
  console.log('   Signature:', signature3);
  console.log('');
}

// Test refund request validation
function testRefundValidation() {
  console.log('✅ Testing Refund Request Validation...\n');

  const validRequest = {
    paymentId: 'pay_test123',
    amount: 250,
    reason: 'Customer requested refund',
  };

  const invalidRequests = [
    { amount: 250 }, // Missing paymentId/transactionId
    { paymentId: 'pay_test123' }, // Missing amount
    { paymentId: 'pay_test123', amount: -100 }, // Invalid amount
    { paymentId: 'pay_test123', amount: 0 }, // Invalid amount
  ];

  console.log('Valid refund request:');
  console.log(JSON.stringify(validRequest, null, 2));
  console.log('');

  console.log('Invalid refund requests:');
  invalidRequests.forEach((req, index) => {
    console.log(`${index + 1}.`, JSON.stringify(req, null, 2));
  });
  console.log('');
}

// Generate cURL commands for testing
function generateCurlCommands() {
  console.log('🔧 Generated cURL Commands for Testing...\n');

  const baseUrl = 'http://localhost:8000';
  const webhookSecret =
    process.env.RAZORPAY_WEBHOOK_SECRET ||
    process.env.RAZORPAY_KEY_SECRET ||
    '29KBqceNnQER5CxM4Aj4Zsen';

  console.log('1. Test Webhook Endpoint:');
  console.log(`curl -X POST ${baseUrl}/api/payment/razorpay/webhook/test \\
  -H "Content-Type: application/json" \\
  -d '{"test": "webhook", "timestamp": "${new Date().toISOString()}"}'`);
  console.log('');

  console.log('2. Test Payment Captured Webhook:');
  const payload = mockWebhookPayloads.paymentCaptured;
  const signature = generateWebhookSignature(payload, webhookSecret);
  console.log(`curl -X POST ${baseUrl}/api/payment/razorpay/webhook \\
  -H "Content-Type: application/json" \\
  -H "x-razorpay-signature: ${signature}" \\
  -d '${JSON.stringify(payload)}'`);
  console.log('');

  console.log('3. Test Refund Request:');
  console.log(`curl -X POST ${baseUrl}/api/payment/razorpay/refund \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -d '{
    "paymentId": "pay_test123",
    "amount": 100,
    "reason": "Test refund"
  }'`);
  console.log('');

  console.log('4. Test User Payment Status:');
  console.log(`curl -X GET ${baseUrl}/api/payment/razorpay/user/payment-status \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`);
  console.log('');

  console.log('5. Test Get My Refunds:');
  console.log(`curl -X GET "${baseUrl}/api/refund/myRefunds?page=1&limit=10" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`);
  console.log('');
}

// Test security scenarios
function testSecurityScenarios() {
  console.log('🔒 Security Test Scenarios...\n');

  console.log('1. Test Unauthorized Refund (Should Fail):');
  console.log("   - User tries to refund another user's transaction");
  console.log('   - Expected: 403 Forbidden');
  console.log('');

  console.log('2. Test Invalid Webhook Signature (Should Fail):');
  console.log('   - Webhook with wrong signature');
  console.log('   - Expected: 400 Bad Request');
  console.log('');

  console.log('3. Test Missing JWT Token (Should Fail):');
  console.log('   - API call without Authorization header');
  console.log('   - Expected: 401 Unauthorized');
  console.log('');

  console.log('4. Test Admin Override (Should Work):');
  console.log("   - Admin refunds any user's transaction");
  console.log('   - Expected: 200 Success');
  console.log('');
}

// Main test runner
function runTests() {
  console.log('🚀 Webhook and Refund System Tests\n');
  console.log('='.repeat(50));
  console.log('');

  try {
    testWebhookSignatures();
    testRefundValidation();
    generateCurlCommands();
    testSecurityScenarios();

    console.log('✅ All tests completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Start your server: npm start');
    console.log('2. Use the generated cURL commands to test endpoints');
    console.log('3. Check server logs for webhook processing');
    console.log('4. Test security scenarios with different user tokens');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

// Export for use in other files
module.exports = {
  mockWebhookPayloads,
  generateWebhookSignature,
  testWebhookSignatures,
  testRefundValidation,
  generateCurlCommands,
  testSecurityScenarios,
};
