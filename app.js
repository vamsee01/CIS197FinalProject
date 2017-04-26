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
            sendTextMessage(sender, 'Please type the name of your desired roommate group')
            marker = 1
          } else if (payload === 'leave_group') {
            sendTextMessageQR(sender)
          } else if (payload === 'join_group') {
            //marker = 3
          } else if (payload === 'group_obligations') {
            //marker = 4
          } else if (payload === 'group_information') {
            //marker = 5
          } else if (payload === 'yes') {
            //sendTextMessage(sender, 'wants to leave group')
            //marker = 0
          } else if (payload === 'no') {
            //sendTextMessage(sender, 'doesnt want to leave group')
            //marker = 0
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
                sendTextMessage(sender, 'Sorry! That group name is already taken. Please try a different group name.')
              } else {
                sendTextMessage(sender, 'Please enter desired password.' + 
                  'Your roommates will need both the group name and entered password to join this group.')
                marker = 2
              }
            })
          } else if (marker === 2 && recipient === BOT_ID) { 
            inputPassword = text
            console.log('group name is ' + groupName)
            console.log('password is ' + inputPassword)
            Groups.addGroup(groupName, inputPassword, sender, function (error) {
              if (error) {
                console.log('Error adding group to database: ', error)
              } else {
                sendTextMessage(sender, 'Successfully created and added you to the ' + groupName + ' group!')
                marker = 0
              }
            })
          }
        }
      }
    }
    res.sendStatus(200)
})

const token = process.env.FB_PAGE_ACCESS_TOKEN

function sendTextMessage (sender, text) {
  let messageData = {text:text}

  request({
    url: 'https://graph.facebook.com/v2.6/me/messages',
    qs: {access_token:token},
    method: 'POST',
    json: {
      recipient: {id:sender},
      message: messageData,
    }
  }, function(error, response, body) {
    if (error) {
      console.log('Error sending message: ', error)
    } else if (response.body.error) {
      console.log('Error: ', response.body.error)
    }
  })
}

function sendTextMessageQR (sender) {
  let textData = 'Are you sure you want to leave your group?'
  let quickRepliesData =  
  [
    {
      content_type: 'text',
      title: 'Yes',
      payload: 'yes',
    },
    {
      content_type: 'text',
      title: 'No',
      payload: 'no',
    }
  ]

  request({
    url: 'https://graph.facebook.com/v2.6/me/messages',
    qs: {access_token:token},
    method: 'POST',
    json: {
      recipient: {id:sender},
      message: {text:textData, quick_replies:quickRepliesData},
    }
  }, function (error, response, body) {
    if (error) {
      console.log('Error sending message: ', error)
    } else if (response.body.error) {
      console.log('Error: ', response.body.error)
    }
  })
}

function firstMessageQR (sender, textData, quickRepliesData) {
  request({
    url: 'https://graph.facebook.com/v2.6/me/messages',
    qs: {access_token:token},
    method: 'POST',
    json: {
      recipient: {id:sender},
      message: {text:textData, quick_replies:quickRepliesData},
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
          title: 'Add or Remove Roommmate Obligations',
          payload: 'group_obligations',
        },
        {
          content_type: 'text',
          title: 'Check Group Information',
          payload: 'group_information',
        },
        {
          content_type: 'text',
          title: 'Leave group',
          payload: 'leave_group'
        }
      ]
      firstMessageQR(sender, textData, quickRepliesData)
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
          payload: 'join_group',
        },
        {
          content_type: 'text',
          title: 'Create new group',
          payload: 'new_group',
        }
      ]
      firstMessageQR(sender, textData, quickRepliesData)
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

