'use strict'

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/newDb');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt');

var roommateSchema = new Schema({
  id: {type: Number, required: true, unique: true},
  chores: {type: [String]},
  dues: {type: [String]},
  obligations: {type: [String]},
});

var groupSchema = new Schema({
  name: {type: String, required: true, unique: true},
  password: {type: String, required: true},
  roommates: [roommateSchema]
});

roommateSchema.pre('save', function (next) {
  var roommate = this;
  roommate.chores = [];
  roommate.dues = [];
  roommate.obligations = [];
  next();
});

groupSchema.pre('save', function (next) {
  var group = this;

  bcrypt.genSalt(10, function( err, salt) {
    if (err) return next (err);

    bcrypt.hash(group.password, salt, function (err, hash) {
      if (err) return next (err);
      group.password = hash;
      next();
    });
  });
});

groupSchema.statics.addGroup = function (name, password, userId, cb) {
  //check if 'name' is unique
  var newGroup = new this({name: name, password: password, roommates: [{id: userId}]});
  newGroup.save(cb);
}

// groupSchema.statics.addUsertoGroup = function (name, user, password, cb) {
//   //check if (inputted) password matches group's password
//   this.findOne({ name: name }, function(err, group) {
//     if (!group) cb('no group');
//     else {
//       bcrypt.compare(password, group.password, function(err, isRight) {
//         if (err) return cb(err);
//         cb(null, isRight);
//       });
//     };
//   });
// }

//module.exports = mongoose.model('RoomateGroups', groupSchema);