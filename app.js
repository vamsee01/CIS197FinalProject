'use strict'

//var vs const

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')


//const config = require('config') //?
//const crypto = require('crypto') //?
//const https = require('https') //?
//const cookieSession = require('cookie-session') //?

const app = express()

app.set('port', (process.env.PORT || 5000))

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))

// Process application/json
app.use(bodyParser.json())

// Index route
app.get('/', function (req, res) {
	res.send('Server for the \'Messenger bot for Roommate Management by Vamsee Mupparapu\''
		+ '\n Go to https://www.facebook.com/Roommate-Management-792706144218311/ to interact with the messenger bot')
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
		    let text = event.message.text
		    sendTextMessage(sender, "Message received, echo: " + text.substring(0, 200))
	    }
    }
    res.sendStatus(200)
})

const token = process.env.FB_PAGE_ACCESS_TOKEN

function sendTextMessage(sender, text) {
	let messageData = { text:text }
	
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
			console.log('Error sending messages: ', error)
		} else if (response.body.error) {
			console.log('Error: ', response.body.error)
		}
	})
}

// getUserName = function(response, convo) {
// var usersPublicProfile = 'https://graph.facebook.com/v2.6/' + response.user + '?fields=first_name,last_name,profile_pic,locale,timezone,gender&access_token=' + process.env.page_token;
// request({
//     url: usersPublicProfile,
//     json: true // parse
// }, function (error, response, body) {
//         if (!error && response.statusCode === 200) {
//             convo.say('Hi ' + body.first_name);
//         }
//     });
// };

// Spin up the server
app.listen(app.get('port'), function() {
	console.log('running on port', app.get('port'))
})

