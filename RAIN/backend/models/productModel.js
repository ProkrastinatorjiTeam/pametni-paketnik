var mongoose = require('mongoose');
var Schema = mongoose.Schema;

const productSchema = new Schema({
    name: {
        type: String,
        required: true
    },

    description: {
        type: String
    },

    images: [{
        type: String
    }],

    price: {
        type: Number,
        required: true
    },

    unit: {
        type: String,
        enum: ['kg', 'piece', 'pack'],
        default: 'piece'
    },

    quantityAvailable: {
        type: Number,
        required: true,
        min: 0
    },

    producer: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },

    expiresAt: {
        type: Date
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('product', productSchema);
