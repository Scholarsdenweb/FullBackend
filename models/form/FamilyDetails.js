const mongoose = require('mongoose');

const familyDetailsSchema = new mongoose.Schema({
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    FatherName: { type: String,    },
    FatherContactNumber: { type: String,    },
    FatherOccupation: { type: String,    },
    MotherName: { type: String,    },
    MotherContactNumber: { type: String,    },
    MotherOccupation: { type: String,    },
    FamilyIncome: { type: String,    },

});

const FamilyDetails= mongoose.model('FamilyDetails', familyDetailsSchema);
module.exports =  FamilyDetails;
