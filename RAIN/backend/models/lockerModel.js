var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var lockerSchema = new Schema({
    'name': {type: String, required: true, unique: true},
    'location': {type: String, required: true},
    'label': {type: String, required: true}, // Why?
    'boxId': {type: Number, required: true, unique: true},
    'status': {type: Boolean, required: true, default: false},
    'createdAt': {type: Date, default: Date.now},
    'allowedToOpen': [{ type: Schema.Types.ObjectId, ref: 'user' }]
});

module.exports = mongoose.model('locker', lockerSchema);