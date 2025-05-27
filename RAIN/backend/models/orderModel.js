var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var orderSchema = new Schema({
    'model': {
        type: Schema.Types.ObjectId,
        ref: 'model3D',
        required: true
    },
    'orderBy': {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    'status': {
        type: String,
        enum: ['pending', 'printing', 'ready to pickup', 'cancelled'],
        default: 'pending'
    },
    'box': {
        type: Schema.Types.ObjectId,
        ref: 'box'
    },
    createdAt: {type: Date, default: Date.now},
    'startedPrintingAt': Date,
    'completedAt': Date
});

module.exports = mongoose.model('order', orderSchema);
