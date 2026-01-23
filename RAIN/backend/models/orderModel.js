const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const orderSchema = new Schema({
    product: {
        type: Schema.Types.ObjectId,
        ref: 'product',
        required: true
    },
    orderBy: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1
    },
    status: {
        type: String,
        enum: ['pending', 'ready for pickup', 'cancelled', 'done'],
        default: 'pending'
    },
    box: {
        type: Schema.Types.ObjectId,
        ref: 'box'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    startedPreparingAt: Date,
    completedAt: Date
});

module.exports = mongoose.model('order', orderSchema);
