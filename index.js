'use strict';

const express = require('express')
    , bodyParser = require('body-parser')
    , request = require('request');

const app = express();
app.set('port', (process.env.PORT || 5000));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

// Index route
app.get('/', function (req, res) {
    res.send('Hello world, I am a chat bot');
});

// For Facebook verification
app.get('/webhook/', function (req, res) {
    if (req.query['hub.verify_token'] === process.env.VERIFICATION_TOKEN) {
        res.send(req.query['hub.challenge']);
    }
    res.send('Error, wrong token');
});

/*
 * All callbacks for Messenger are POST-ed. They will be sent to the same
 * webhook. Be sure to subscribe your app to your page to receive callbacks
 * for your page.
 * https://developers.facebook.com/docs/messenger-platform/product-overview/setup#subscribe_app
 *
 */
app.post('/webhook', function (req, res) {
    var data = req.body,
        fs = require('fs');

    if (data.object === 'page') {
        data.entry.forEach(function(pageEntry) {
            var pageID = pageEntry.id;
            var timeOfEvent = pageEntry.time;

            // Iterate over each messaging event
            pageEntry.messaging.forEach(function(messagingEvent) {
                if (messagingEvent.message) receivedMessage(messagingEvent);
            });
        });

        res.sendStatus(200);
    }
});

/*
 * Message Event
 *
 * This event is called when a message is sent to your page. The 'message'
 * object format can vary depending on the kind of message that was received.
 * Read more at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-received
 *
 * For this example, we're going to echo any text that we get. If we get some
 * special keywords ('button', 'generic', 'receipt'), then we'll send back
 * examples of those bubbles to illustrate the special message bubbles we've
 * created. If we receive a message with an attachment (image, video, audio),
 * then we'll simply confirm that we've received the attachment.
 *
 */
function receivedMessage(event) {
    var senderID = event.sender.id,
        recipientID = event.recipient.id,
        timeOfMessage = event.timestamp,
        message = event.message;

    var messageText = message.text,
        messageAttachments = message.attachments,
        quickReply = message.quick_reply,
        metadata = message.metadata,
        isEcho   = message.is_echo,
        messageId = message.mid,
        appId = message.app_id;

    if (messageText) {
        // If we receive a text message, check to see if it matches any special
        // keywords and send back the corresponding example. Otherwise, just echo
        // the text we received.
        var replyMessage,
            addedMessage;

        switch (messageText.replace(/[^\w\s]/gi, '').trim().toLowerCase()) {
            case 'hello':
            case 'hi':
            case 'hii':
                sendHiMessage(senderID, recipientID);
                break;
            case 'what is you name':
            case 'your name please':
                replyMessage = "My name is ShopwareBot!! :)";
                sendTextMessage(senderID, replyMessage);
                break;
            case 'who is your creator':
                replyMessage = "He is awsome men. Grig Harutyunyan! :)";
                sendTextMessage(senderID, replyMessage);
                break;
            case 'how are you':
                replyMessage = "Oh thanks.. I'm fine.. and you ? :)";
                sendTextMessage(senderID, replyMessage);
                break;
            case 'im too':
            case 'too':
                replyMessage = "It's fine ;) now tell me how i can help you ?";
                addedMessage = "Im ShopwareBot ^_^ "
                    + "And i can suggest you some kind of products from BlackhettDesigns market. "
                    + "I think you will love our products";
                sendTextMessage(senderID, replyMessage);
                setTimeout(function () {
                    sendTypingOn(senderID);
                }, 1000);
                setTimeout(function () {
                    sendTypingOff(senderID);
                    sendTextMessage(senderID, addedMessage);
                }, 4000);
                break;
            case 'really':
            case 'its fine':
            case 'right':
                replyMessage = "Please type start and send me !!";
                addedMessage = "Sure i will help you :)";
                sendTextMessage(senderID, replyMessage);
                sendTypingOn(senderID);
                setTimeout(function () {
                    sendTypingOff(senderID);
                }, 2000);
                sendTextMessage(senderID, addedMessage);
                break;
            case 'start':
                sendButtonMessage(senderID);
                break;
            default:
                sendTextMessage(senderID, messageText);
                break;
        }
    }
}

function sendHiMessage(senderID, recipientID) {
    request({
        url: 'https://graph.facebook.com/v2.11/' + senderID,
        qs: {
            access_token: process.env.PAGE_ACCESS_TOKEN,
            fields: "first_name"
        },
        method: 'GET'
    }, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            var bodyObject = JSON.parse(body);
            var firstName  = bodyObject.first_name;
            var responseText = "Hi " + firstName + "."
                + " I'm a simple bot."
                + " Now i haven't more functionality."
                + " Sorry fot that. I WILL BE BACK SOON."
                + " Good Luck....";

            sendTextMessage(senderID, responseText);

        } else {
            console.error("Failed calling Send API");
            console.error(response.statusCode);
            console.error(response.statusMessage);
            console.error(body.error);
        }
    });
}
function sendTextMessage(recipientId, messageText) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: messageText
        }
    };

    callSendAPI(messageData);
}
function sendTypingOn(recipientId, messageText) {
    var messageData = {
        sender_action: "typing_on",
        recipient: {
            id: recipientId
        }

    };

    if (typeof messageText !== 'undefined') {
        messageData.message = {
            text: messageText
        }
    }
    callSendAPI(messageData);
}
function sendTypingOff(recipientId, messageText) {
    var messageData = {
        sender_action: "typing_off",
        recipient: {
            id: recipientId
        }
    };

    if (typeof messageText !== 'undefined') {
        messageData.message = {
            text: messageText
        }
    }

    callSendAPI(messageData);
}
function sendReadReceipt(recipientId, messageText) {
    var messageData = {
        sender_action: "mark_seen",
        recipient: {
            id: recipientId
        }
    };

    if (typeof messageText !== 'undefined') {
        messageData.message = {
            text: messageText
        }
    }

    callSendAPI(messageData);
}

function sendButtonMessage(recipientId) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "button",
                    text: "",
                    buttons:[{
                        type: "web_url",
                        url: "https://www.oculus.com/en-us/rift/",
                        title: "Open Web URL"
                    }, {
                        type: "postback",
                        title: "Trigger Postback",
                        payload: "DEVELOPER_DEFINED_PAYLOAD"
                    }, {
                        type: "phone_number",
                        title: "Call Phone Number",
                        payload: "+16505551234"
                    }]
                }
            }
        }
    };

    callSendAPI(messageData);
}

function callSendAPI(mesageData) {
    request({
        url: "https://graph.facebook.com/v2.11/me/messages",
        qs: {
            access_token: process.env.PAGE_ACCESS_TOKEN
        },
        method: "POST",
        json: mesageData
    }, function(error, response, body) {
        if (error) {
            console.log(response.error);
        }
    });
}

// Spin up the server
app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'));
});