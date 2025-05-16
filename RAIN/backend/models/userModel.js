var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt');

var userSchema = new Schema({
    'firstName': {type: String, required: true},
    'lastName': {type: String, required: true},
    'username': {type: String, required: true, unique: true},
    'email': {type: String, required: true, unique: true},
    'password': {type: String, required: true},
    'role': {type: String, enum: ['user', 'admin'], default: 'user'},
    'createdAt': {type: Date, default: Date.now},
});

userSchema.statics.authenticate = async function (username, password) {
    try {
        const user = await this.findOne({ username: username }).exec();

        if (!user) {
            throw new Error('Username not found');
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
            return user;
        } else {
            throw new Error('Invalid password');
        }
    } catch (err) {
        throw err;
    }
};

userSchema.pre('save', function (next) {
    var user = this;
    bcrypt.hash(user.password, 10, function (err, hash) {
        if (err) {
            return next(err);
        }
        user.password = hash;
        next();
    });
})

var User = mongoose.model('user', userSchema);
module.exports = User;
