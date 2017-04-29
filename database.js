'use strict'

var mongoose = require('mongoose')
mongoose.connect(process.env.MONGODB_URI)
var Schema = mongoose.Schema
var bcrypt = require('bcrypt')

var groupSchema = new Schema({
  name: {type: String, required: true, unique: true},
  password: {type: String, required: true},
  roommates: [{id: Number}],
  bills: {type: Number},
  groceries: [{grocery: String}],
  chores: [{chore: String}]
});

groupSchema.pre('save', function (next) {
  var group = this

  if (!group.isModified('password')) return next();

  bcrypt.genSalt(10, function( err, salt) {
    if (err) return next (err)

    bcrypt.hash(group.password, salt, function (err, hash) {
      if (err) return next (err)
      group.password = hash
      next()
    })
  })
})

groupSchema.post('update', function (doc) {
  console.log('here in update middleware')
  console.log('bills is ' + doc.bills)
})

groupSchema.statics.addGroup = function (groupName, password, userId, cb) {
  var newGroup = new this({name: groupName, password: password, roommates: [{id: userId}], bills: 0, groceries:[], chores: []});
  newGroup.save(cb)
}

groupSchema.statics.containsGroup = function (groupName, cb) {
  this.findOne({name: groupName}, function (error, group) {
    if (error) {
      cb(error, null)
    } else if (!group) {
      cb(null, false)
    } else {
      cb(null, true)
    }
  })
}

groupSchema.statics.containsUser = function (userId, cb) {
  this.find({roommates: {$elemMatch: {id: userId}}}, function (error, group) {
    if (error) {
      cb(error, null)
    } else if (!group.length) {
      cb(null, false)
    } else {
      cb(null, true)
    }
  })
}

groupSchema.statics.addUser = function (groupName, userId, cb) {
  this.update({name: groupName}, {$push: {roommates: {id: userId}}}, function (error) {
    if (error) {
      cb(error)
    } else {
      cb(null)
    }
  })
}

groupSchema.statics.addChore = function (userId, newChore, cb) {
  this.update({roommates: {$elemMatch: {id: userId}}}, {$push: {chores: {chore: newChore}}}, function (error) {
    if (error) {
      cb(error)
    } else {
      cb(null)
    }
  })
}

groupSchema.statics.addGrocery = function(userId, newGrocery, cb) {
  this.update({roommates: {$elemMatch: {id: userId}}}, {$push: {groceries: {grocery: newGrocery}}}, function (error) {
    if (error) {
      cb(error)
    } else {
      cb(null)
    }
  })
}

groupSchema.statics.updateBills = function(userId, change, cb) {
  this.update({roommates: {$elemMatch: {id: userId}}}, {$inc: {bills: change}}, function (error) {
    if (error) {
      cb(error)
    } else {
      cb(null)
    }     
  })
}


groupSchema.statics.checkPassword = function (groupName, password, cb) {
  this.findOne({name: groupName}, function (error, group) {
    if (error) {
      cb(error, null)
    } else {
      bcrypt.compare(password, group.password, function (error, isRight) {
        if (error) {
          cb(error, null)
        } else {
          cb(null, isRight)
        }
      })
    }
  })
}

groupSchema.statics.removeUser = function (userId, cb) {
  this.update({roommates: {$elemMatch: {id: userId}}}, {$pull: {roommates: {id : userId}}}, function (error) {
    if (error) {
      cb(error)
    } else {
      cb(null)
    }
  })
}

groupSchema.statics.getGroupInformation = function (userId, cb) {
  var query = this.find({roommates: {$elemMatch: {id: userId}}});
  query.select('name roommates bills groceries chores')
  query.lean(true)
  query.exec(function (error, group) {
    if (error) {
      cb(error, null)
    } else {
      cb(null, group)
    }
  })
}

module.exports = mongoose.model('RoomateGroups', groupSchema)