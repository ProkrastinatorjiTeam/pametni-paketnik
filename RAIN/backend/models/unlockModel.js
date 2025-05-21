var mongoose = require('mongoose');
var Schema   = mongoose.Schema;

var unlockSchema = new Schema({
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
	'timestamp' : {type: Date, default: Date.now}
});

module.exports = mongoose.model('unlock', unlockSchema);
