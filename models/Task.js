const mongoose = require("mongoose");
const TaskSchema = mongoose.Schema({
    taskName:{
        type: String,
        required: true
    },
    taskDescription: {
        type: String,
        required: true
    },
    taskStatus: {
        type: String,
        required: true
    },
    taskAssignedDate: {
        type: Date,
        // required: true
    },
    taskCompletionDate:{
        type: Date,
    }
})


const Task = mongoose.model("Task", TaskSchema);

module.exports = Task;