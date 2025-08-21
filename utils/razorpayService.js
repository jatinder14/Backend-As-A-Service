const Razorpay = require('razorpay');

class RazorpayService {
  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_R5dcC7mGZBJI9y',
      key_secret: process.env.RAZORPAY_KEY_SECRET || '29KBqceNnQER5CxM4Aj4Zsen',
    });
  }

  async fetchPayment(paymentId) {
    try {
      const payment = await this.razorpay.payments.fetch(paymentId);
      return payment;
    } catch (error) {
      console.error('Error fetching payment:', error);
      throw error;
    }
  }

  async createRefund(paymentId, options = {}) {
    try {
      const refund = await this.razorpay.payments.refund(paymentId, options);
      return refund;
    } catch (error) {
      console.error('Error creating refund:', error);
      throw error;
    }
  }

  async fetchRefund(refundId) {
    try {
      const refund = await this.razorpay.refunds.fetch(refundId);
      return refund;
    } catch (error) {
      console.error('Error fetching refund:', error);
      throw error;
    }
  }

  async createOrder(options) {
    try {
      const order = await this.razorpay.orders.create(options);
      return order;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  async createPaymentLink(options) {
    try {
      const paymentLink = await this.razorpay.paymentLink.create(options);
      return paymentLink;
    } catch (error) {
      console.error('Error creating payment link:', error);
      throw error;
    }
  }

  validateWebhookSignature(body, signature, secret) {
    try {
      return Razorpay.validateWebhookSignature(body, signature, secret);
    } catch (error) {
      console.error('Error validating webhook signature:', error);
      return false;
    }
  }
}

module.exports = new RazorpayService();
