import { Schema, model, models } from 'mongoose';

const dataSchema = new Schema({
  marketplace: { type: String, required: true },
  signature: { type: String, required: true },
  instruction: { type: String, required: true },
  data: { type: Array },
});

export const Transactions =
  models.ethTransactions || model('ethTransactions', dataSchema);
