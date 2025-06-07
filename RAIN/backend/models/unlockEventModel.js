var mongoose = require('mongoose');
var Schema   = mongoose.Schema;

var unlockEventSchema = new Schema({
    'user' : {
         type: Schema.Types.ObjectId,
         ref: 'user',
        required: true
    },
    'box' : {
         type: Schema.Types.ObjectId,
         ref: 'box',
        required: true
    },
    'timestamp' : {type: Date, default: Date.now},
    'success' : {type: Boolean, default: false}
});

module.exports = mongoose.model('unlockEvent', unlockEventSchema);