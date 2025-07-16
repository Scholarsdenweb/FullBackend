// models/Counter.js
const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Use format 'YYMMDD'
  seq: { type: Number, default: 1 },
});

const Counter = mongoose.model("Counter", counterSchema);
module.exports = Counter;
