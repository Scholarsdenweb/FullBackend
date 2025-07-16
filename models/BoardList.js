const mongoose = require('mongoose');

const boardListSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    }
})
const BoardList = mongoose.model('BoardList', boardListSchema);
module.exports = BoardList;