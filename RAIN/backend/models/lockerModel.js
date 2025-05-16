var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var lockerSchema = new Schema({
    'name': {type: String, required: true, unique: true},
    'location': {type: String, required: true},
    'label': {type: String, required: true},
    'status': {type: Boolean, required: true, default: false},
    'createdAt': {type: Date, default: Date.now}
});

module.exports = mongoose.model('locker', lockerSchema);
