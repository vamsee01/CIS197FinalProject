'use strict'

var mongoose = require('mongoose');
//mongoose.connect('mongodb://localhost/newDb');
mongoose.connect(process.env.MONGODB_URI);
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt');

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
  this.findOne({name: groupName}, function (error, group) {
    if (error) {
      cb(error, null)
    } else if (!group) {
      cb(null, null);
    } else {
      //console.log('Contains group: group name is ' + group.name)
      cb(null, group);
    }
  })
}

groupSchema.statics.containsUser = function (userId, cb) {
  this.find({roommates: {$elemMatch: {userId}}}, function (error, group) {
    if (error) {
      cb(error, null)
    } else if (!group) {
      cb(null, false);
    } else {
      cb(null, true);
    }
  })
}

//groupSchema.statics.addUser

//groupSchema.statics.removeUser

module.exports = mongoose.model('RoomateGroups', groupSchema);