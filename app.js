'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()

const Groups = require('./database')

let marker = 0
let groupName
let inputPassword

const BOT_ID = '792706144218311'

app.set('port', (process.env.PORT || 5000))

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))

// Process application/json
app.use(bodyParser.json())

// Index route
app.get('/', function (req, res) {
  res.send('Server for the \'Messenger bot for Roommate Management by Vamsee Mupparapu\'.'
    + '\n Go to https://www.facebook.com/Roommate-Management-792706144218311/ to interact with the messenger bot.')
})

// for Facebook verification
app.get('/webhook/', function (req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
    req.query['hub.verify_token'] === process.env.HUB_VERIFY_TOKEN) {
    res.send(req.query['hub.challenge'])
  }
  res.send('Error, wrong token')
})

app.post('/webhook/', function (req, res) {
    let messaging_events = req.body.entry[0].messaging
    for (let i = 0; i < messaging_events.length; i++) {
     let event = req.body.entry[0].messaging[i]
      let sender = event.sender.id
      let recipient = event.recipient.id
      if (event.message && event.message.text) {
        //Handle a text message from this sender
        let text = event.message.text
        if (event.message.quick_reply) {
          //Handle a quick reply selection
          let payload = event.message.quick_reply.payload

          if (payload === 'new_group') {
            sendTextMessageBackQR(sender, 'Please type the name of your desired roommate group')
            marker = 1
          } else if (payload === 'leave_group') {
            yesNoQR(sender)
          } else if (payload === 'join_group') {
            sendTextMessageBackQR(sender, 'Please type the name of group you want to join')
            marker = 3
          } else if (payload === 'group_obligations') {
            //marker = 4
          } else if (payload === 'group_information') {
            Groups.getGroupInformation(sender, function (error, group) {
              if (error) {
                console.log('Error getting group information: ', error)
              } else {
                console.log('group name is ' + group.name + 'group roommates are ' + group.roommates)
              }
            })
            //marker = 5
          } else if (payload === 'yes') {
            Groups.removeUser(sender, function (error) {
              if (error) {
                console.log('Error removing user his group: ', error)
              } else {
                console.log('Successfully removed ' + sender + ' from his/her group')
                sendTextMessage(sender, 'Successfully removed you from your roommate group. ...')
                marker = 0
                getInformation(sender)
              }
            })
          } else if (payload === 'no' || payload === 'back') {
            marker = 0
            getInformation(sender)
          }
        } else {
          if (marker === 0) {
            getInformation(sender)
          } else if (marker === 1 && recipient === BOT_ID) {
            groupName = text
            Groups.containsGroup(groupName, function(error, isInDatabase) {
              if (error) {
                console.log('Error searching for group in database: ', error)
              } else if (isInDatabase) {
                sendTextMessageBackQR(sender, 'Sorry! That group name is already taken. Please try a different group name.')
              } else {
                sendTextMessageBackQR(sender, 'Please enter desired password.' + 
                  ' Your roommates will need both the group name and entered password to join this group.')
                marker = 2
              }
            })
          } else if (marker === 2 && recipient === BOT_ID) { 
            inputPassword = text
            //console.log('group name is ' + groupName)
            //console.log('password is ' + inputPassword)
            Groups.addGroup(groupName, inputPassword, sender, function (error) {
              if (error) {
                console.log('Error adding group to database: ', error)
              } else {
                sendTextMessage(sender, 'Successfully created and added you to the ' + groupName + ' group!')
                marker = 0
                getInformation(sender)
              }
            })
          } else if (marker === 3 && recipient === BOT_ID) {
            groupName = text
            Groups.containsGroup(groupName, function(error, isInDatabase) {
              if (error) {
                console.log('Error searching for group in database: ', error)
              } else if (isInDatabase) {
                sendTextMessageBackQR(sender, 'Please enter the group-specific password.')
                marker = 4
              } else {
                sendTextMessageBackQR(sender, 'There is no group with that name. Please try again.')
              }
            })
          } else if (marker === 4 && recipient === BOT_ID) {
            inputPassword = text
            //console.log('groupName is ' + groupName)
            //console.log('inputPassword is ' + inputPassword)
            Groups.checkPassword(groupName, inputPassword, function (error, isRight) {
              if (error) {
                console.log('Error checking password in database: ', error)
              } else if (!isRight) {
                console.log('isRight : ' + isRight)
                sendTextMessageBackQR(sender, 'Invalid Password: could not add you to the group. Please try again.')
              } else {
                console.log('isRight : ' + isRight)
                Groups.addUser(groupName, sender, function (err) {
                  if (err) {
                    console.log('Error adding user to database: ', err)
                    sendTextMessageBackQR(sender, 'Could not add you to the group. Please try entering password again.')
                  } else {
                    sendTextMessage(sender, 'Successfully added you to the ' + groupName + ' group!')
                    marker = 0
                    getInformation(sender)
                  }
                })
              }
            })
          }
        }
      }
    }
    res.sendStatus(200)
})

const token = process.env.FB_PAGE_ACCESS_TOKEN


function sendTextMessageBackQR (sender, textData) {
  let quickRepliesData = 
  [
    {
      content_type: 'text',
      title: 'Go back to main menu',
      payload: 'back'
    }
  ]
  messageQR(sender, textData, quickRepliesData)
}

function sendTextMessage (sender, text) {
  let messageData = {text:text}

  request({
    url: 'https://graph.facebook.com/v2.6/me/messages',
    qs: {access_token:token},
    method: 'POST',
    json: {
      recipient: {id:sender},
      message: messageData
    }
  }, function(error, response, body) {
    if (error) {
      console.log('Error sending message: ', error)
    } else if (response.body.error) {
      console.log('Error: ', response.body.error)
    }
  })
}

function yesNoQR (sender) {
  let textData = 'Are you sure you want to leave your group?'
  let quickRepliesData =  
  [
    {
      content_type: 'text',
      title: 'Yes',
      payload: 'yes'
    },
    {
      content_type: 'text',
      title: 'No',
      payload: 'no'
    }
  ]

  request({
    url: 'https://graph.facebook.com/v2.6/me/messages',
    qs: {access_token:token},
    method: 'POST',
    json: {
      recipient: {id:sender},
      message: {text:textData, quick_replies:quickRepliesData}
    }
  }, function (error, response, body) {
    if (error) {
      console.log('Error sending message: ', error)
    } else if (response.body.error) {
      console.log('Error: ', response.body.error)
    }
  })
}

function messageQR (sender, textData, quickRepliesData) {
  request({
    url: 'https://graph.facebook.com/v2.6/me/messages',
    qs: {access_token:token},
    method: 'POST',
    json: {
      recipient: {id:sender},
      message: {text:textData, quick_replies:quickRepliesData}
    }
  }, function (error, response, body) {
    if (error) {
      console.log('Error sending message: ', error)
    } else if (response.body.error) {
      console.log('Error: ', response.body.error)
    }
  })
}

function checkUserID (sender, firstName) {
  Groups.containsUser(sender, function (error, isInDatabase) {
    if (error) {
      console.log('Error searching for group in database: ', error)
    } else if (isInDatabase) {
      console.log(sender + ' is in database')
      console.log('isInDatabase = ' + isInDatabase)
      let textData = 'Hi ' + firstName + ', '
      + 'You are currently in a group. Please select an option.'
      let quickRepliesData =  
      [
        {
          content_type: 'text',
          title: 'Update Obligations',
          payload: 'group_obligations'
        },
        {
          content_type: 'text',
          title: 'Group Info',
          payload: 'group_information'
        },
        {
          content_type: 'text',
          title: 'Leave group',
          payload: 'leave_group'
        }
      ]
      messageQR(sender, textData, quickRepliesData)
    } else {
      console.log(sender + ' not in database')
      console.log('isInDatabase = ' + isInDatabase)
      let textData = 'Hi ' + firstName + ', '
      + 'You are currently not in a group. Please select an option.'
      let quickRepliesData =  
      [
        {
          content_type: 'text',
          title: 'Join existing group',
          payload: 'join_group'
        },
        {
          content_type: 'text',
          title: 'Create new group',
          payload: 'new_group'
        }
      ]
      messageQR(sender, textData, quickRepliesData)
    }
  })
}

/*
 * First name: body.first_name
 * Last name: body.last_name
 * Profile Picture: body.profile_pic
 * Locale: body.locale
 * Timezone: body.timezone
 * Gender: body.gender
 */

function getInformation (sender) {
  let profileInformation = 'https://graph.facebook.com/v2.6/' + sender + '?fields=first_name,last_name,profile_pic,locale,timezone,gender&access_token=' + token;
  request({
    url: profileInformation,
    json: true //parse
  }, function(error, response, body) {
    if (error) {
      console.log('Error obtaining profile information: ', error)
    } else if (response.body.error) {
      console.log('Error: ', response.body.error)
    } else {
      checkUserID(sender, body.first_name)
    }
  })
}

// Spin up the server
app.listen(app.get('port'), function() {
  console.log('running on port', app.get('port'))
})