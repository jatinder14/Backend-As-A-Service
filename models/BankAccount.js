const mongoose = require('mongoose');

const BankAccountSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    accountNumber: { type: String, required: true },
    accountName: { type: String, required: true },
    iban: { type: String, required: true },
    branchName: { type: String, required: true },

    // documents
    emiratesIdFront: { type: String },
    emiratesIdBack: { type: String },
    passport: { type: String },
    ejari: { type: String },

    // keys
    maintenanceKey: { type: Boolean },
    accessCard: { type: Boolean },
    parkingKey: { type: Boolean },

}, { timestamps: true });

module.exports = mongoose.model('BankAccount', BankAccountSchema);
