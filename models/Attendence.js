const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId, // Reference to the employee collection
        required: true,
        ref: 'Employee'
    },
    date: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['present', 'absent', 'leave'],
        required: true
    },
    checkInTime: {
        type: String, // Store as "HH:mm" (e.g., "09:00")
        default: null
    },
    checkOutTime: {
        type: String, // Store as "HH:mm" (e.g., "17:00")
        default: null
    },
    hoursWorked: {
        type: Number, // Store hours as a number (e.g., 8.5)
        default: null
    },
    remarks: {
        type: String,
        default: null
    }
}, {
    timestamps: true // Automatically adds createdAt and updatedAt fields
});

// Add a compound index for efficient querying by employee and date
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

// Export the model
const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
