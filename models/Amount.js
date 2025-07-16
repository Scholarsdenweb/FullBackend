const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const AmountSchema = new mongoose.Schema({
    amount : {
        type: Number,
        required : true,
    },
    
});

// Hash password before saving

module.exports = mongoose.model('Amount', AmountSchema);