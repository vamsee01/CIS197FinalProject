'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const app = express();

const Groups = require('./database');
const token = process.env.FB_PAGE_ACCESS_TOKEN;
const BOT_ID = '792706144218311';

let marker = 0;
let groupName;
let inputPassword;

let ctr1 = 0;
let ctr2 = 0;
let ctr3 = 0;
let roommateMsg;
let billsMsg;
let choresMsg;
let groceriesMsg;

let groceries;
let chores;
let numChores;
let numGroceries;
let numRoommates;
let toSend;

app.set('port', (process.env.PORT || 5000));

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}));

// Process application/json
app.use(bodyParser.json());

// Index route
app.get('/', function (req, res) {
  res.send('Server for the \'Messenger bot for Roommate Management by Vamsee Mupparapu\'.'
    + '\n Go to https://www.facebook.com/Roommate-Management-792706144218311/ to interact with the messenger bot.'
    + '\n Because the messenger bot has not been made public, you must be made a tester by Vamsee'
    + 'to interact with it.');
});

// for Facebook verification
app.get('/webhook/', function (req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
    req.query['hub.verify_token'] === process.env.HUB_VERIFY_TOKEN) {
    res.send(req.query['hub.challenge']);
  }
  res.send('Error, wrong token');
});

app.post('/webhook/', function (req, res) {
  let messaging_events = req.body.entry[0].messaging;
  for (let i = 0; i < messaging_events.length; i++) {
    let event = req.body.entry[0].messaging[i];
    let sender = event.sender.id;
    let recipient = event.recipient.id;
    if (event.message && event.message.text) {
        //Handle a text message from this sender
      let text = event.message.text;
      if (event.message.quick_reply) {
          //Handle a quick reply selection
        let payload = event.message.quick_reply.payload;

        if (payload === 'new_group') {
          sendTextMessageBackQR(sender, 'Please type the name of your desired roommate group');
          marker = 1;
        } else if (payload === 'leave_group') {
          yesNoQR(sender);
        } else if (payload === 'join_group') {
          sendTextMessageBackQR(sender, 'Please type the name of group you want to join');
          marker = 3;
        } else if (payload === 'update_info') {
          let quickRepliesData =  
            [
              {
                content_type: 'text',
                title: 'Update bills',
                payload: 'bills'
              },
              {
                content_type: 'text',
                title: 'Update groceries',
                payload: 'groceries'
              },
              {
                content_type: 'text',
                title: 'Update chores',
                payload: 'chores'
              },
              {
                content_type: 'text',
                title: 'Go back to main menu',
                payload: 'back'
              }
            ];
          messageQR(sender, 'Please select an option', quickRepliesData);
        } else if (payload === 'group_info') {
          marker = 4;
          toSend = sender;
          Groups.getGroupInformation(sender, function (error, group) {
            if (error) {
              console.log('Error getting group information: ', error);
            } else {
              let g = group[0];
              let name = g.name;
              roommateMsg = 'Group Name: ' + name + ' (';
              
              let roommates = g.roommates;                
              numRoommates = Object.keys(roommates).length;
              roommateMsg = roommateMsg + numRoommates + ' Roommates)';

              let bills = g.bills;
              billsMsg = 'Bills to be collectively shared total to $' + bills;

              groceries = g.groceries;
              numGroceries = Object.keys(groceries).length;
              groceriesMsg = 'Groceries needed:';

              chores = g.chores;
              numChores = Object.keys(chores).length;
              choresMsg = 'Chores that need to be done:';
                
              roommates.forEach(function (element) {
                getInformation(element.id);
              });
            }
          });
        } else if (payload === 'yes') {
          Groups.removeUser(sender, function (error) {
            if (error) {
              console.log('Error removing user his/her group: ', error);
            } else {
              sendTextMessage(sender, 'Successfully removed you from your roommate group. ...');
              marker = 0;
              getInformation(sender);
            }
          });
        } else if (payload === 'no' || payload === 'back') {
          marker = 0;
          getInformation(sender);
        } else if (payload === 'bills') {
          marker = 5;
          sendTextMessageBackQR(sender, 'Enter a number you want to add or subtract to the collective group bills'
          + '(i.e. \'4\' or \'-4\'). Reference \'Group Info\' to see the current amount.');
        } else if (payload === 'groceries') {
          sendTextMessageAddRemoveQR(sender, 'groceries');
        } else if (payload === 'chores') {
          sendTextMessageAddRemoveQR(sender, 'chores');
        } else if (payload === 'add_groceries') {
          marker = 7;
          sendTextMessageBackQR(sender, 'Enter the grocery you want to add');
        } else if (payload === 'remove_groceries') {
          marker = 8;
          sendTextMessageBackQR(sender, 'Enter the grocery you wish to remove.'
          + ' (Reference \'Group Info\' to see the listed groceries.)');
        } else if (payload === 'add_chores') {
          marker = 9;
          sendTextMessageBackQR(sender, 'Enter the chore you want to add');
        } else if (payload === 'remove_chores') {
          marker = 10;
          sendTextMessageBackQR(sender, 'Enter the chore you wish to remove.'
          + ' (Reference \'Group Info\' to see the the listed chores.)');
        }
      } else {
        if (marker === 0) {
          getInformation(sender);
        } else if (marker === 1 && recipient === BOT_ID) {
          groupName = text;
          Groups.containsGroup(groupName, function (error, isInDatabase) {
            if (error) {
              console.log('Error searching for group in database: ', error);
            } else if (isInDatabase) {
              sendTextMessageBackQR(sender, 'Sorry! That group name is already taken. Please try a different group name.');
            } else {
              sendTextMessageBackQR(sender, 'Please enter desired password.' + 
              ' Your roommates will need both the group name and entered password to join this group.');
              marker = 2;
            }
          });
        } else if (marker === 2 && recipient === BOT_ID) { 
          inputPassword = text;
          Groups.addGroup(groupName, inputPassword, sender, function (error) {
            if (error) {
              console.log('Error adding group to database: ', error);
            } else {
              sendTextMessage(sender, 'Successfully created and added you to the ' + groupName + ' group!');
              marker = 0;
              getInformation(sender);
            }
          });
        } else if (marker === 3 && recipient === BOT_ID) {
          groupName = text;
          Groups.containsGroup(groupName, function (error, isInDatabase) {
            if (error) {
              console.log('Error searching for group in database: ', error);
            } else if (isInDatabase) {
              sendTextMessageBackQR(sender, 'Please enter the group-specific password.');
              marker = 4;
            } else {
              sendTextMessageBackQR(sender, 'There is no group with that name. Please try again.');
            }
          });
        } else if (marker === 4 && recipient === BOT_ID) {
          inputPassword = text;
          Groups.checkPassword(groupName, inputPassword, function (error, isRight) {
            if (error) {
              console.log('Error checking password in database: ', error);
            } else if (!isRight) {
              sendTextMessageBackQR(sender, 'Invalid Password: could not add you to the group. Please try again.');
            } else {
              Groups.addUser(groupName, sender, function (error) {
                if (error) {
                  console.log('Error adding user to database: ', error);
                  sendTextMessageBackQR(sender, 'Could not add you to the group. Please try entering password again.');
                } else {
                  sendTextMessage(sender, 'Successfully added you to the ' + groupName + ' group!');
                  marker = 0;
                  getInformation(sender);
                }
              });
            }
          });
        } else if (marker === 5 && recipient === BOT_ID) {
          let change = parseInt(text);
          if (isNaN(change)) {
            marker = 6;
            sendTextMessageBackQR(sender, 'Invalid input. Please enter a positive or negative number only');
          } else {
            Groups.updateBills(sender, change, function (error) {
              if (error) {
                console.log('Error changing bills value in database: ', error);
                sendTextMessageBackQR(sender, 'Could not complete computation. Please try again.');
              } else {
                sendTextMessage(sender, 'Successfully changed value!');
                marker = 0;
                getInformation(sender);
              }
            });
          }
        } else if (marker === 7 && recipient === BOT_ID) {
          Groups.addGrocery(sender, text, function (error) {
            if (error) {
              console.log('Error adding grocery to database: ', error);
              sendTextMessageBackQR(sender, 'Could not add grocery. Please try again.');
            } else {
              sendTextMessage(sender, 'Successfully added inputted grocery!');
              marker = 0;
              getInformation(sender);
            }
          });
        } else if (marker === 8 && recipient === BOT_ID) {
          Groups.removeGrocery(sender, text, function (error) {
            if (error) {
              marker = 11;
              sendTextMessageBackQR(sender, 'Invalid input. Please refer to \'Group Info\' for listed groceries.');
            } else {
              sendTextMessage(sender, 'Successfully removed inputted grocery');
              marker = 0;
              getInformation(sender);
            }
          });
        } else if (marker === 9 && recipient === BOT_ID) {
          Groups.addChore(sender, text, function (error) {
            if (error) {
              console.log('Error adding chore to database: ', error);
              sendTextMessageBackQR(sender, 'Could not add chore. Please try again.');
            } else {
              sendTextMessage(sender, 'Successfully added inputted chore!');
              marker = 0;
              getInformation(sender);
            }
          });
        } else if (marker === 10 && recipient === BOT_ID) {
          Groups.removeChore(sender, text, function (error) {
            if (error) {
              marker = 11;
              sendTextMessageBackQR(sender, 'Invalid input. Please refer to \'Group Info\' for listed chores.');
            } else {
              sendTextMessage(sender, 'Successfully removed inputted chore');
              marker = 0;
              getInformation(sender);
            }
          });
        }
      }
    }
  }
  res.sendStatus(200);
});

function sendTextMessageAddRemoveQR(sender, type) {
  let textData = 'Do you want add or remove an item from ' + type + '?';
  let quickRepliesData = 
    [
      {
        content_type: 'text',
        title: 'Add ' + type,
        payload: 'add_' + type
      },
      {
        content_type: 'text',
        title: 'Remove ' + type,
        payload: 'remove_' + type
      },
      {
        content_type: 'text',
        title: 'Go back to main menu',
        payload: 'back'
      }
    ];
  messageQR(sender, textData, quickRepliesData);
}


function sendTextMessageBackQR(sender, textData) {
  let quickRepliesData;
  if (marker === 6) {
    quickRepliesData =
    [
      {
        content_type: 'text',
        title: 'Back',
        payload: 'bills'
      }
    ];
    messageQR(sender, textData, quickRepliesData);
  } else if (marker === 11) {
    quickRepliesData =
    [
      {
        content_type: 'text',
        title: 'Back',
        payload: 'groceries'
      }
    ];
    messageQR(sender, textData, quickRepliesData);
  } else if (marker === 12) {
    quickRepliesData =
    [
      {
        content_type: 'text',
        title: 'Back',
        payload: 'chores'
      }
    ];
    messageQR(sender, textData, quickRepliesData);
  } else {
    quickRepliesData =
    [
      {
        content_type: 'text',
        title: 'Go back to main menu',
        payload: 'back'
      }
    ];
    messageQR(sender, textData, quickRepliesData);
  }

}

function sendTextMessage(sender, text) {
  let messageData = {text:text};

  request({
    url: 'https://graph.facebook.com/v2.6/me/messages',
    qs: {access_token:token},
    method: 'POST',
    json: {
      recipient: {id:sender},
      message: messageData
    }
  }, function (error, response, body) {
    if (error) {
      console.log('Error sending message: ', error);
    } else if (response.body.error) {
      console.log('Error: ', response.body.error);
    }
  });
}

function yesNoQR(sender) {
  let textData = 'Are you sure you want to leave your group?';
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
    ];

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
      console.log('Error sending message: ', error);
    } else if (response.body.error) {
      console.log('Error: ', response.body.error);
    }
  });
}

function messageQR(sender, textData, quickRepliesData) {
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
      console.log('Error sending message: ', error);
    } else if (response.body.error) {
      console.log('Error: ', response.body.error);
    }
  });
}

function checkUserID(sender, body) {
  let firstName = body.first_name;
  Groups.containsUser(sender, function (error, isInDatabase) {
    if (error) {
      console.log('Error searching for group in database: ', error);
    } else if (isInDatabase) {
      let textData = 'Hi ' + firstName + ', '
      + 'You are currently in a group. Please select an option.';
      let quickRepliesData =  
        [
          {
            content_type: 'text',
            title: 'Update Info',
            payload: 'update_info'
          },
          {
            content_type: 'text',
            title: 'Group Info',
            payload: 'group_info'
          },
          {
            content_type: 'text',
            title: 'Leave group',
            payload: 'leave_group'
          },
        ];
      messageQR(sender, textData, quickRepliesData);
    } else {
      let textData = 'Hi ' + firstName + ', '
      + 'You are currently not in a group. Please select an option.';
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
        ];
      messageQR(sender, textData, quickRepliesData);
    }
  });
}

function sendGroupInfoMsg(sender, message) {
  if (numGroceries === 0 && numChores === 0) {
    sendTextMessageBackQR(sender, message + '\n' + groceriesMsg + '\n' + choresMsg);
  } else if (numChores === 0) {
    groceries.forEach(function (element) {
      groceriesMsg = groceriesMsg + '\n' + element.grocery;
      ctr2++;
      if (ctr2 === numGroceries) {
        ctr2 = 0;
        sendTextMessageBackQR(sender, message + '\n' + groceriesMsg + '\n' + choresMsg);
      }
    });
  } else if (numGroceries === 0) {
    chores.forEach(function (element) {
      choresMsg = choresMsg + '\n' + element.chore;
      ctr3++;
      if (ctr3 === numChores) {
        ctr3 = 0;
        sendTextMessageBackQR(sender, message + '\n' + groceriesMsg + '\n' + choresMsg);
      }
    });
  } else {
    groceries.forEach(function (element) {
      groceriesMsg = groceriesMsg + '\n' + element.grocery;
      ctr2++;
      if (ctr2 === numGroceries) {
        ctr2 = 0;
        chores.forEach(function (element) {
          choresMsg = choresMsg + '\n' + element.chore;
          ctr3++;
          if (ctr3 === numChores) {
            ctr3 = 0;
            sendTextMessageBackQR(sender, message + '\n' + groceriesMsg + '\n' + choresMsg);
          }
        });
      }
    });
  }
}

/*
 * First name: body.first_name
 * Last name: body.last_name
 * Profile Picture: body.profile_pic
 * Locale: body.locale
 * Timezone: body.timezone
 * Gender: body.gender
 */
function getInformation(sender) {
  let profileInformation = 'https://graph.facebook.com/v2.6/' + sender + '?fields=first_name,last_name,profile_pic,locale,timezone,gender&access_token=' + token;
  request({
    url: profileInformation,
    json: true
  }, function (error, response, body) {
    if (error) {
      console.log('Error obtaining profile information: ', error);
    } else if (response.body.error) {
      console.log('Error: ', response.body.error);
    } else if (marker === 0) {
      checkUserID(sender, body);
    } else {
      roommateMsg = roommateMsg + '\n' + body.first_name + ' ' + body.last_name;
      ctr1++;
      if (ctr1 === numRoommates) {
        ctr1 = 0;
        marker = 0;
        sendGroupInfoMsg(toSend, roommateMsg + '\n' + billsMsg);
      }
    }
  });
}

// Spin up the server
app.listen(app.get('port'), function () {
  console.log('running on port', app.get('port'));
});