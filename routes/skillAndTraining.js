const mongoose = require('mongoose');

const SkillsTrainingSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    skills: [{ type: String }],
    trainingPrograms: [{ 
        programName: { type: String },
        completionDate: { type: Date }
    }]
});

module.exports = mongoose.model('SkillsTraining', SkillsTrainingSchema);
