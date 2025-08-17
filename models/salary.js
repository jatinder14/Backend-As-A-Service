const mongoose = require('mongoose');

const PayPeriodSchema = new mongoose.Schema(
  {
    startDate: { type: Date, required: true },
    endDate: {
      type: Date,
      required: true,
      validate: {
        validator: function (v) {
          return v > this.startDate;
        },
        message: 'End date must be greater than start date!',
      },
    },
    baseSalary: { type: Number, required: true },
    allowances: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    currency: { type: String, default: 'AED' },
  },
  { timestamps: true }
);

const SalarySchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    payPeriod: [PayPeriodSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Salary', SalarySchema);
