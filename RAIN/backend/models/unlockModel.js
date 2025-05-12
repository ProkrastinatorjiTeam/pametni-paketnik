var mongoose = require('mongoose');
var Schema   = mongoose.Schema;

var unlockSchema = new Schema({
	'user' : {
	 	type: Schema.Types.ObjectId,
	 	ref: 'user',
		required: true
	},
	'locker' : {
	 	type: Schema.Types.ObjectId,
	 	ref: 'locker',
		required: true
	},
	'timestamp' : {type: Date, default: Date.now}
});

module.exports = mongoose.model('unlock', unlockSchema);
