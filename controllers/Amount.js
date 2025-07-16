const Amount = require("../models/Amount");

const addAmount = async (req, res) => {
  try {
    const { amount } = req.body;
    const addAmountValue = await Amount.create({
      amount,
    });

    // await addAmountValue.save();

    console.log("addAmountValue", addAmountValue);

    return res.status(200).json({ message: "Amount added", addAmountValue });
  } catch (error) {
    console.log("error from addAmountValue", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const getAmount = async (req, res) => {
  try {
    const getAmount = await Amount.findOne();
    console.log("getAmount", getAmount);
    return res.status(200).json(getAmount);
  } catch (error) {
    console.log("error from getAmount", getAmount);
    return res.status(500).json({ Message: "Server Error" });
  }
};
// const updateAmount = async (req, res) => {
//   try {
//     const { id, amount } = req.body;

//     const updatedAmount = await Amount.findByIdAndUpdate(
//       id,
//       { $set: { amount } },
//       { new: true } // returns the updated document
//     );

//     console.log("Updated Amount:", updatedAmount);

//     return res.status(200).json({ updatedAmount });
//   } catch (error) {
//     console.error("Error from updateAmount:", error);
//     return res.status(500).json({ message: "Server error" });
//   }
// };

const updateAmount = async (req, res) => {
  try {
    const { changedAmount } = req.body;

    const updatedAmount = await Amount.findOne();

    updatedAmount.amount = changedAmount;

    await updatedAmount.save();

    console.log("updateAmount", updateAmount);

    return res.status(200).json({ updateAmount });
  } catch (error) {
    console.log("error from updateAmount", error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = { addAmount, getAmount, updateAmount };
