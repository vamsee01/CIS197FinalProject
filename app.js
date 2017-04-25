'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()

//const Groups = require('./database')

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
      if (event.message && event.message.text) {
        //Handle a text message from this sender
        let text = event.message.text
        if (event.message.quick_reply) {
          let payload = event.message.quick_reply.payload

          if (payload === 'new_group') {
            sendTextMessage(sender, 'Please type the name of your desired roommate group')
          } 
        } else {
          getInformation(sender)
          //sendTextMessage(sender, "Message received, echo: " + text.substring(0, 200))
        }
      } 
      // else if (event.postback && event.postback.payload) {
      //   //Handle a payload from this sender
      //   payload = event.postback.payload;

      //   if (payload === 'join_group') {
      //     //sendTextMessage(sender, '')
      //   } else if (payload === 'new_group') {
      //     sendTextMessage(sender, 'Please type the name of your roommate group')
      //   }
      // }
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

function sendTextMessageQR (sender, profile) {
  //check if sender is in database or not

  // let textData = 'Hi ' + profile.first_name + ', '
  // + 'You are currently in ... . Please select an option.'
  // let quickRepliesData =  
  // [
  //   {
  //     content_type: 'text',
  //     title: 'Add or Remove Roommmate Obligations',
  //     payload: 'group_obligations',
  //   },
  //   {
  //     content_type: 'text',
  //     title: 'Check Group Information',
  //     payload: 'group_information',
  //   },
  //   {
  //     content_type: 'text',
  //     title: 'Leave group',
  //     payload: 'leave_group'
  //   }
  // ]

  let textData = 'Hi ' + profile.first_name + ', '
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

/*
 * First name: body.first_name
 * Last name: body.last_name
 * Profile Picture: body.profile_pic
 * Locale: body.locale
 * Timezone: body.timezone
 * Gender: body.gender
 */

function getInformation (sender) {
  let profile = 'https://graph.facebook.com/v2.6/' + sender + '?fields=first_name,last_name,profile_pic,locale,timezone,gender&access_token=' + token;
  request({
    url: profile,
    json: true //parse
  }, function(error, response, body) {
    if (error) {
      console.log('Error obtaining profile information: ', error)
    } else if (response.body.error) {
      console.log('Error: ', response.body.error)
    } else {
      sendTextMessageQR(sender, body)
    }
  })
}

// Spin up the server
app.listen(app.get('port'), function() {
  console.log('running on port', app.get('port'))
})

