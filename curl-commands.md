# cURL Commands for Webhook and Refund Testing (Updated with User Authorization)

## Environment Setup

```bash
# Set your base URL
export BASE_URL="http://localhost:8000"
# or for production
# export BASE_URL="https://backend.empireinfratech.ae"

# Set your JWT token (get from login)
export JWT_TOKEN="your_jwt_token_here"
```

## 🔒 **Security Updates**

- ✅ Users can only request refunds for their own transactions
- ✅ Transaction table now requires userId association
- ✅ User model tracks payment status and subscription info
- ✅ Webhook updates user payment status automatically

## 1. Authentication (Get JWT Token)

```bash
# Login to get JWT token
curl -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "your_password"
  }'
```

## 2. Razorpay Payment Operations

### Create Payment Link

```bash
curl -X POST $BASE_URL/api/payment/razorpay/createPaymentLink \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "planSlug": "premium-plan",
    "billingCycle": "monthly"
  }'
```

### Create Razorpay Order

```bash
curl -X POST $BASE_URL/api/payment/razorpay/createOrder \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "planSlug": "premium-plan",
    "billingCycle": "monthly"
  }'
```

### Fetch Payment Details

```bash
curl -X GET $BASE_URL/api/payment/razorpay/fetchPayment/pay_XXXXXXXXXX \
  -H "Authorization: Bearer $JWT_TOKEN"
```

## 3. Refund Operations

### Initiate Refund (via Razorpay route)

```bash
curl -X POST $BASE_URL/api/payment/razorpay/refund \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "paymentId": "pay_XXXXXXXXXX",
    "amount": 250.00,
    "reason": "Customer requested refund"
  }'
```

### Initiate Refund with Transaction ID

```bash
curl -X POST $BASE_URL/api/payment/razorpay/refund \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "transactionId": "transaction_id_here",
    "amount": 100.50,
    "reason": "Product not delivered"
  }'
```

### Create Refund (via Refund route)

```bash
curl -X POST $BASE_URL/api/refund/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "transactionId": "transaction_id_here",
    "amount": 150.00,
    "reason": "Service not satisfactory"
  }'
```

## 4. Refund Management

### Get My Refunds

```bash
curl -X GET "$BASE_URL/api/refund/myRefunds?page=1&limit=10" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### Get My Refunds with Status Filter

```bash
curl -X GET "$BASE_URL/api/refund/myRefunds?page=1&limit=10&status=PENDING" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### Get All Refunds (Admin Only)

```bash
curl -X GET "$BASE_URL/api/refund/?page=1&limit=20" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### Get All Refunds with Filters (Admin Only)

```bash
curl -X GET "$BASE_URL/api/refund/?page=1&limit=10&status=COMPLETED&startDate=2024-01-01&endDate=2024-12-31&search=customer@email.com" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### Get Specific Refund

```bash
curl -X GET $BASE_URL/api/refund/refund_id_here \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### Update Refund (Admin Only)

```bash
curl -X PUT $BASE_URL/api/refund/refund_id_here \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "status": "COMPLETED",
    "reason": "Updated reason"
  }'
```

### Delete Refund (Admin Only)

```bash
curl -X DELETE $BASE_URL/api/refund/refund_id_here \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### Get Refund Statistics (Admin Only)

```bash
curl -X GET "$BASE_URL/api/refund/stats/summary?startDate=2024-01-01&endDate=2024-12-31" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

## 5. Webhook Testing

### Test Webhook Endpoint

```bash
curl -X POST $BASE_URL/api/payment/razorpay/webhook/test \
  -H "Content-Type: application/json" \
  -d '{
    "test": "webhook",
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }'
```

### Simulate Payment Captured Webhook

```bash
# Generate signature (you'll need to calculate this with your webhook secret)
WEBHOOK_SECRET="your_webhook_secret"
PAYLOAD='{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_test123","order_id":"order_test123","amount":50000,"currency":"INR","status":"captured","created_at":'$(date +%s)'}}}}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" -binary | base64)

curl -X POST $BASE_URL/api/payment/razorpay/webhook \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: $SIGNATURE" \
  -d "$PAYLOAD"
```

### Simulate Payment Failed Webhook

```bash
PAYLOAD='{"event":"payment.failed","payload":{"payment":{"entity":{"id":"pay_test124","order_id":"order_test124","amount":50000,"currency":"INR","status":"failed","created_at":'$(date +%s)'}}}}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" -binary | base64)

curl -X POST $BASE_URL/api/payment/razorpay/webhook \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: $SIGNATURE" \
  -d "$PAYLOAD"
```

### Simulate Refund Created Webhook

```bash
PAYLOAD='{"event":"refund.created","payload":{"refund":{"entity":{"id":"rfnd_test123","payment_id":"pay_test123","amount":25000,"currency":"INR","status":"processed","created_at":'$(date +%s)'}}}}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" -binary | base64)

curl -X POST $BASE_URL/api/payment/razorpay/webhook \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: $SIGNATURE" \
  -d "$PAYLOAD"
```

## 6. Transaction Operations

### Get All Transactions

```bash
curl -X GET "$BASE_URL/api/transaction?page=1&limit=10" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### Get Transaction by ID

```bash
curl -X GET $BASE_URL/api/transaction/transaction_id_here \
  -H "Authorization: Bearer $JWT_TOKEN"
```

## 7. Error Testing

### Test Invalid Refund (Missing Amount)

```bash
curl -X POST $BASE_URL/api/payment/razorpay/refund \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "paymentId": "pay_XXXXXXXXXX"
  }'
```

### Test Invalid Refund (Negative Amount)

```bash
curl -X POST $BASE_URL/api/payment/razorpay/refund \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "paymentId": "pay_XXXXXXXXXX",
    "amount": -100
  }'
```

### Test Unauthorized Access

```bash
curl -X POST $BASE_URL/api/payment/razorpay/refund \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "pay_XXXXXXXXXX",
    "amount": 100
  }'
```

### Test Invalid Webhook Signature

```bash
curl -X POST $BASE_URL/api/payment/razorpay/webhook \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: invalid_signature" \
  -d '{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_test","amount":1000}}}}'
```

## 8. Health Check

```bash
curl -X GET $BASE_URL/
```

## 9. Batch Testing Script

### Create a test script

```bash
#!/bin/bash
# save as test-api.sh

BASE_URL="http://localhost:8000"
JWT_TOKEN="your_jwt_token"

echo "Testing API endpoints..."

# Test health
echo "1. Health check:"
curl -s $BASE_URL/ | jq .

# Test refund creation
echo "2. Creating refund:"
curl -s -X POST $BASE_URL/api/payment/razorpay/refund \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "paymentId": "pay_test123",
    "amount": 100,
    "reason": "Test refund"
  }' | jq .

# Test getting refunds
echo "3. Getting my refunds:"
curl -s -X GET "$BASE_URL/api/refund/myRefunds?page=1&limit=5" \
  -H "Authorization: Bearer $JWT_TOKEN" | jq .

echo "API testing completed!"
```

### Make it executable and run

```bash
chmod +x test-api.sh
./test-api.sh
```

## Notes:

1. **Replace placeholders:**
   - `your_jwt_token_here` with actual JWT token
   - `pay_XXXXXXXXXX` with actual payment IDs
   - `transaction_id_here` with actual transaction IDs
   - `refund_id_here` with actual refund IDs

2. **For webhook signature generation:**
   - Use your actual webhook secret
   - The signature calculation shown is simplified
   - In production, use proper HMAC SHA256 calculation

3. **Response formats:**
   - Add `| jq .` to format JSON responses
   - Add `-v` flag for verbose output
   - Add `-s` flag for silent mode (no progress)

4. **Authentication:**
   - Most endpoints require valid JWT token
   - Admin endpoints require admin role
   - Some endpoints are public (health check, webhook)

## 8. \*\*U

ser Payment Status & Subscription\*\*

### Get My Payment Status and Subscription Info

```bash
curl -X GET http://localhost:8000/api/payment/razorpay/user/payment-status \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Check if User is Paid Customer

```bash
curl -X GET http://localhost:8000/api/payment/razorpay/subscription/status/user_id \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## 9. **Security Testing (User Authorization)**

### Test Unauthorized Refund Request (Should Return 403)

```bash
# Try to refund someone else's transaction - should fail
curl -X POST http://localhost:8000/api/payment/razorpay/refund \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "transactionId": "65f8a1b2c3d4e5f6a7b8c9d0",
    "amount": 100,
    "reason": "Unauthorized refund attempt"
  }'
```

### Test Access to Other User's Refunds (Should Return 403)

```bash
# Try to access refunds that don't belong to you - should fail
curl -X GET http://localhost:8000/api/refund/65f8a1b2c3d4e5f6a7b8c9d1 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Test My Own Refund Request (Should Work)

```bash
# Request refund for your own transaction - should work
curl -X POST http://localhost:8000/api/payment/razorpay/refund \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "transactionId": "my_transaction_id_here",
    "amount": 100,
    "reason": "Valid refund request"
  }'
```

## 10. **Admin Testing**

### Admin Can Refund Any Transaction

```bash
# Admin can refund any user's transaction
curl -X POST http://localhost:8000/api/payment/razorpay/refund \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin_jwt_token_here" \
  -d '{
    "transactionId": "any_transaction_id",
    "amount": 100,
    "reason": "Admin refund"
  }'
```

### Admin Can View All Refunds

```bash
curl -X GET "http://localhost:8000/api/refund/?page=1&limit=20" \
  -H "Authorization: Bearer admin_jwt_token_here"
```

## 11. **Updated Test Script with Security Checks**

```bash
#!/bin/bash
# Save as test-secure-refunds.sh

echo "🔒 Testing Secure Refund System..."

# Set your tokens
USER_TOKEN="user_jwt_token_here"
ADMIN_TOKEN="admin_jwt_token_here"

echo "1. Test User Payment Status:"
curl -s -X GET http://localhost:8000/api/payment/razorpay/user/payment-status \
  -H "Authorization: Bearer $USER_TOKEN" | jq .

echo "2. Test User's Own Refund (Should Work):"
curl -s -X POST http://localhost:8000/api/payment/razorpay/refund \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{
    "transactionId": "user_own_transaction_id",
    "amount": 50,
    "reason": "Valid user refund"
  }' | jq .

echo "3. Test Unauthorized Refund (Should Fail):"
curl -s -X POST http://localhost:8000/api/payment/razorpay/refund \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{
    "transactionId": "other_user_transaction_id",
    "amount": 50,
    "reason": "Unauthorized refund"
  }' | jq .

echo "4. Test Admin Refund (Should Work):"
curl -s -X POST http://localhost:8000/api/payment/razorpay/refund \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "transactionId": "any_transaction_id",
    "amount": 50,
    "reason": "Admin refund"
  }' | jq .

echo "✅ Security testing completed!"
```

## 📋 **Key Security Features Tested:**

1. **User Authorization**: Users can only refund their own transactions
2. **Transaction Ownership**: All transactions must be associated with a user
3. **Payment Status Tracking**: User model tracks payment history and subscription status
4. **Admin Override**: Admins can refund any transaction
5. **Webhook Security**: Webhooks update user payment status automatically
6. **Access Control**: Users can only view their own refunds and payment history

## 🔧 **Database Updates:**

### User Model Additions:

- `isPaidCustomer`: Boolean flag for paid customers
- `paymentHistory`: Array of payment records
- `totalAmountPaid`: Total amount paid by user
- `totalRefunded`: Total amount refunded to user
- `firstPaymentDate` & `lastPaymentDate`: Payment tracking

### Transaction Model Updates:

- `userId`: Required field linking transaction to user
- Enhanced metadata for better tracking

These updates ensure that your refund system is secure and users can only access their own data!
