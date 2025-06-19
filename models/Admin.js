const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const AdminSchema = new mongoose.Schema({
    contactNumber : {
        type: String,
        required : true,
    },
    role : {
        type: String,
        required : true,
        enum: ["admin", "manager"]
    }
});

// Hash password before saving

module.exports = mongoose.model('Admin', AdminSchema);