const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Refund = require('../models/Refund');

/**
 * Utility functions to keep User payment/refund data in sync
 * This hybrid approach maintains summary data in User model for quick access
 * while keeping detailed records in separate collections
 */

/**
 * Update user payment history when a new transaction is created
 */
const addTransactionToUser = async (userId, transactionData) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Add to payment history (keep only essential data)
    const paymentEntry = {
      transactionId: transactionData._id,
      amount: transactionData.amount,
      status: transactionData.status.toLowerCase(),
      date: transactionData.createdAt || new Date(),
      planName: transactionData.metadata?.planName,
      billingCycle: transactionData.metadata?.billingCycle,
    };

    user.paymentHistory.push(paymentEntry);

    // Update summary fields
    if (transactionData.status === 'COMPLETED') {
      user.totalAmountPaid += transactionData.amount;
      user.isPaidCustomer = true;
      user.lastPaymentDate = paymentEntry.date;

      if (!user.firstPaymentDate) {
        user.firstPaymentDate = paymentEntry.date;
      }
    }

    user.totalTransactions += 1;
    user.lastActivity = new Date();

    await user.save();
    return user;
  } catch (error) {
    console.error('Error adding transaction to user:', error);
    throw error;
  }
};

/**
 * Update user refund history when a new refund is created
 */
const addRefundToUser = async (userId, refundData) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Add to refund history (keep only essential data)
    const refundEntry = {
      refundId: refundData.refundId,
      transactionId: refundData.transactionId,
      amount: refundData.amount || parseFloat(refundData.refundedAmount),
      status: refundData.status.toLowerCase(),
      date: refundData.createdAt || new Date(),
      reason: refundData.reason,
    };

    user.refundHistory.push(refundEntry);

    // Update summary fields
    if (refundData.status === 'COMPLETED') {
      user.totalRefunded += refundEntry.amount;
      user.lastRefundDate = refundEntry.date;
    }

    user.totalRefunds += 1;
    user.lastActivity = new Date();

    await user.save();
    return user;
  } catch (error) {
    console.error('Error adding refund to user:', error);
    throw error;
  }
};

/**
 * Update user data when transaction status changes
 */
const updateTransactionStatus = async (userId, transactionId, newStatus) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Find and update the transaction in payment history
    const paymentIndex = user.paymentHistory.findIndex(
      p => p.transactionId.toString() === transactionId.toString()
    );

    if (paymentIndex !== -1) {
      const oldStatus = user.paymentHistory[paymentIndex].status;
      user.paymentHistory[paymentIndex].status = newStatus.toLowerCase();

      // Update summary fields based on status change
      const amount = user.paymentHistory[paymentIndex].amount;

      if (oldStatus !== 'completed' && newStatus === 'COMPLETED') {
        user.totalAmountPaid += amount;
        user.isPaidCustomer = true;
        user.lastPaymentDate = new Date();

        if (!user.firstPaymentDate) {
          user.firstPaymentDate = new Date();
        }
      } else if (oldStatus === 'completed' && newStatus !== 'COMPLETED') {
        user.totalAmountPaid -= amount;
        user.isPaidCustomer = user.totalAmountPaid > 0;
      }

      user.lastActivity = new Date();
      await user.save();
    }

    return user;
  } catch (error) {
    console.error('Error updating transaction status:', error);
    throw error;
  }
};

/**
 * Update user data when refund status changes
 */
const updateRefundStatus = async (userId, refundId, newStatus) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Find and update the refund in refund history
    const refundIndex = user.refundHistory.findIndex(r => r.refundId === refundId);

    if (refundIndex !== -1) {
      const oldStatus = user.refundHistory[refundIndex].status;
      user.refundHistory[refundIndex].status = newStatus.toLowerCase();

      // Update summary fields based on status change
      const amount = user.refundHistory[refundIndex].amount;

      if (oldStatus !== 'completed' && newStatus === 'COMPLETED') {
        user.totalRefunded += amount;
        user.lastRefundDate = new Date();
      } else if (oldStatus === 'completed' && newStatus !== 'COMPLETED') {
        user.totalRefunded -= amount;
      }

      user.lastActivity = new Date();
      await user.save();
    }

    return user;
  } catch (error) {
    console.error('Error updating refund status:', error);
    throw error;
  }
};

/**
 * Get user's recent transactions (from User model for quick access)
 */
const getUserRecentTransactions = async (userId, limit = 10) => {
  try {
    const user = await User.findById(userId)
      .select('paymentHistory')
      .populate('paymentHistory.transactionId', 'razorpayPaymentId createdAt');

    if (!user) {
      throw new Error('User not found');
    }

    return user.paymentHistory.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limit);
  } catch (error) {
    console.error('Error getting user recent transactions:', error);
    throw error;
  }
};

/**
 * Get user's recent refunds (from User model for quick access)
 */
const getUserRecentRefunds = async (userId, limit = 10) => {
  try {
    const user = await User.findById(userId).select('refundHistory');

    if (!user) {
      throw new Error('User not found');
    }

    return user.refundHistory.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limit);
  } catch (error) {
    console.error('Error getting user recent refunds:', error);
    throw error;
  }
};

/**
 * Recalculate user payment/refund totals from actual Transaction/Refund collections
 * Use this for data integrity checks or migrations
 */
const recalculateUserTotals = async userId => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get actual data from collections - now much simpler with direct userId!
    const [transactions, refunds] = await Promise.all([
      Transaction.find({ userId }),
      Refund.find({ userId }), // Direct query using userId
    ]);

    // Recalculate totals
    const completedTransactions = transactions.filter(t => t.status === 'COMPLETED');
    const completedRefunds = refunds.filter(r => r.status === 'COMPLETED');

    user.totalAmountPaid = completedTransactions.reduce((sum, t) => sum + t.amount, 0);
    user.totalRefunded = completedRefunds.reduce(
      (sum, r) => sum + (r.amount || parseFloat(r.refundedAmount)),
      0
    );
    user.totalTransactions = transactions.length;
    user.totalRefunds = refunds.length;
    user.isPaidCustomer = user.totalAmountPaid > 0;

    // Update dates
    if (completedTransactions.length > 0) {
      const sortedTransactions = completedTransactions.sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      );
      user.firstPaymentDate = sortedTransactions[0].createdAt;
      user.lastPaymentDate = sortedTransactions[sortedTransactions.length - 1].createdAt;
    }

    if (completedRefunds.length > 0) {
      const sortedRefunds = completedRefunds.sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      );
      user.lastRefundDate = sortedRefunds[sortedRefunds.length - 1].createdAt;
    }

    await user.save();
    return user;
  } catch (error) {
    console.error('Error recalculating user totals:', error);
    throw error;
  }
};

module.exports = {
  addTransactionToUser,
  addRefundToUser,
  updateTransactionStatus,
  updateRefundStatus,
  getUserRecentTransactions,
  getUserRecentRefunds,
  recalculateUserTotals,
};
