var mongoose = require('mongoose');
var Schema   = mongoose.Schema;

var model3DSchema = new Schema({
	'name' : { type: String, required: true },
	'description' : String,
	'images' : [{type: String}],
	'estimatedPrintTime' : {type: Number},
	'price' : {type: Number, required: false, default: null},
	'createdBy' : {
	 	type: Schema.Types.ObjectId,
	 	ref: 'user'
	},
	'createdAt' : { type: Date, default: Date.now }
});

module.exports = mongoose.model('model3D', model3DSchema);
