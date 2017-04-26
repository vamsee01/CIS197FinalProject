'use strict'

var mongoose = require('mongoose');
//mongoose.connect('mongodb://localhost/newDb');
mongoose.connect(process.env.MONGODB_URI);
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt');

var groupSchema = new Schema({
  name: {type: String, required: true, unique: true},
  password: {type: String, required: true},
  roommates: [{id: Number}]
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
  var newGroup = new this({name: groupName, password: password, roommates: [{id: userId}]});
  newGroup.save(cb);
}

groupSchema.statics.containsGroup = function (groupName, cb) {
  this.findOne({name: groupName}, function (error, group) {
    if (error) {
      cb(error, null);
    } else if (!group) {
      cb(null, false);
    } else {
      cb(null, true);
    }
  })
}

groupSchema.statics.containsUser = function (userId, cb) {
  this.find({roommates: {$elemMatch: {id: userId}}}, function (error, group) {
    if (error) {
      cb(error, null);
    } else if (!group.length) {
      cb(null, false);
    } else {
      cb(null, true);
    }
  })
}

groupSchema.statics.addUser = function (groupName, password, userId, cb) {
  this.findOne({name: groupName}, function (error, group) {
    if (error) {
      cb(error);
    } else {
      bcrypt.compare(password, group.password, function (error) {
        if (error) {
          cb(error);
          return;
        } 
      })
    }
  })
  //fix this... atm will always update regardless if correct password or not
  this.update({name: groupName}, {$push: {roommates: {id: userId}}}, function (error) {
    if(error) {
      cb(error)
    } else {
      cb(null)
    }
  })
}

groupSchema.statics.removeUser = function (userId, cb) {
  this.update({roommates: {$elemMatch: {id: userId}}}, {$pull: {roommates: {$in : userId}}}, function (error) {
    if (error) {
      cb(error)
    } else {
      cb(null)
    }
  })
}

module.exports = mongoose.model('RoomateGroups', groupSchema);