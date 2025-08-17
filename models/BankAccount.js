const mongoose = require('mongoose');

const BankAccountSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, unique: true },
    accountNumber: { type: String, required: true },
    accountName: { type: String, required: true },
    iban: { type: String, required: true },
    branchName: { type: String, required: true },

    // documents
    emiratesIdFront: { type: String },
    emiratesIdBack: { type: String },
    passport: { type: String },

    ejari: { type: String },
    Addendum: { type: String },
    // gracePeriod: { type: Date },
    startDate: { type: Date, required: true },
    endDate: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          // console.log("------------fadf", fthis.startDate, this.endDate)
          return value >= this.startDate;
        },
        message: 'End date must be greater than or equal to start date',
      },
    },

    // keys
    maintenanceKey: { type: Boolean },
    accessCard: { type: Boolean },
    parkingKey: { type: Boolean },
  },
  { timestamps: true }
);

// Pre-save hook to automatically calculate grace period
// BankAccountSchema.pre('save', async function (next) {
//     if (!this.gracePeriod) {
//         const lead = await mongoose.model('Lead').findById(this.leadId);
//         if (lead) {
//             let daysToAdd = 0;

//             if (lead.apartmentType === 'Furnished') {
//                 daysToAdd = 5;
//             } else if (['Semi-Furnished', 'Unfurnished'].includes(lead.apartmentType)) {
//                 daysToAdd = Math.floor(Math.random() * (15 - 10 + 1)) + 10; // Random between 10–15
//             }
//             console.log("===", this.endDate, lead, this.gracePeriod, this);
//             if (this.endDate) {
//                 this.gracePeriod = new Date(this.endDate);
//                 this.gracePeriod.setDate(this.gracePeriod.getDate() + daysToAdd);
//             }
//         }
//     }
//     next();
// });

module.exports = mongoose.model('BankAccount', BankAccountSchema);
