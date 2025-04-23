const mongoose = require('mongoose');

const educationalDetailsSchema = new mongoose.Schema({
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    SchoolName: { type: String  },
    Percentage: { type: Number  },
    Class: { type: String  },
    YearOfPassing: { type: Number  },
    Board: { type: String  },
});

const EducationalDetails = mongoose.model('EducationalDetails', educationalDetailsSchema);

module.exports = EducationalDetails;