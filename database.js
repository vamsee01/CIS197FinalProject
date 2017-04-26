'use strict'

var mongoose = require('mongoose');
//mongoose.connect('mongodb://localhost/newDb');
mongoose.connect(process.env.MONGODB_URI);
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt');

// var roommateSchema = new Schema({
//   id: {type: Number, required: true, unique: true},
//   chores: {type: [String]},
//   dues: {type: [String]},
//   obligations: {type: [String]},
// });

// roommateSchema.pre('save', function (next) {
//   var roommate = this;
//   roommate.chores = [];
//   roommate.dues = [];
//   roommate.obligations = [];
//   next();
// });

var groupSchema = new Schema({
  name: {type: String, required: true, unique: true},
  password: {type: String, required: true},
  roommates: {type: [Number]}
});

groupSchema.pre('save', function (next) {
  var group = this;

  if (!group.isModified('password')) return next();

  bcrypt.genSalt(10, function( err, salt) {
    if (err) return next (err);

    bcrypt.hash(group.password, salt, function (err, hash) {
      if (err) return next (err);
      group.password = hash;
      next();
    });
  });
});

groupSchema.statics.addGroup = function (groupName, password, userId, cb) {
  var newGroup = new this({name: groupName, password: password, roommates: [userId]});
  newGroup.save(cb);
}

groupSchema.statics.containsGroup = function (groupName, cb) {
  this.findOne({name: groupName}, function (err, group) {
    if (!group) {
      cb(null, false);
    } else {
      cb(null, true);
    }
  })
}

// groupSchema.statics.containsUser = function (userId, cb) {
//   var group = this.find().elemMatch('roommates', userId);
//   if (!group) {
//     cb('error');
//   } else {
//     console.log(group.name);
//     cb(group.name);
//   }
// }

module.exports = mongoose.model('RoomateGroups', groupSchema);