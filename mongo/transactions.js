const { Schema, model, models } = require('mongoose');

const dataSchema = new Schema({
  marketplace: { type: String, required: true },
  transactionHash: { type: String, required: true },
  instruction: { type: String, required: true },
  data: { type: Array },
});

const Transactions =
  models.ethTransactions || model('ethtransactions', dataSchema);

module.exports = Transactions;
