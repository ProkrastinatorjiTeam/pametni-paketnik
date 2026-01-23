var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var boxSchema = new Schema({
    'name': { type: String, required: true },
    'location': { type: String, required: false },
    'physicalId': { type: Number, required: true, unique: true },
    'createdAt': { type: Date, default: Date.now },
    'authorizedUsers': [{ type: Schema.Types.ObjectId, ref: 'user' }],
    'isBusy': { type: Boolean, default: false }
});

module.exports = mongoose.model('box', boxSchema);