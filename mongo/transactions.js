const { Schema, model, models } = require('mongoose');

const dataSchema = new Schema(
  {
    marketplace: { type: String, required: true },
    transactionHash: { type: String, required: true },
    instruction: { type: String, required: true },
    data: {
      seller: { type: String },
      buyer: { type: String },
      collectionAddress: { type: String },
      tokenNumber: { type: String },
      price: { type: Number },
    },
  },
  {
    timestamps: true,
  },
);

dataSchema.set('timestamps', true);

const Transactions =
  models.ethTransactions || model('ethtransactions', dataSchema);

module.exports = Transactions;
