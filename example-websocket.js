
// ***** WEBSOCKET *****// TODO: move this all to one file
wsServer = new webSocketServer({
  httpServer: app
});

app.on('upgrade', wsServer.handleUpgrade);

/**
 * Global variables for websocket
 */
// latest 100 messages
var history = [ ];
// list of currently connected clients (users)
var clients = [ ];

/**
 * Helper function for escaping input strings
 */
function htmlEntities(str) {
  return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Array with some colors in random order
var colors = [ 'red', 'green', 'blue', 'magenta', 'purple', 'plum', 'orange' ];
colors.sort(function(a,b) { return Math.random() > 0.5; } );

// This callback function is called every time someone
// tries to connect to the WebSocket server
//check 'request.origin' to make sure client is connecting from this website
wsServer.on('request', function(request) {
  console.log((new Date()) + ' Connection from origin '
      + request.origin + '.');
  var connection = request.accept(null, request.origin);

  var index = clients.push(connection) - 1; // client index, TODO change to userid
  var userName = false; //TODO change to user.username
  var userColor = false;

  console.log((new Date()) + ' Connection accepted.');

  // send back chat history
  if (history.length > 0) {
    connection.sendUTF(
        JSON.stringify({ type: 'history', data: history} ));
  }

  // handle all messages from users here.
  connection.on('message', function(message) {
    if (message.type === 'utf8') {
      // for new user
      if (userName === false) {
       // remember user name
       userName = htmlEntities(message.utf8Data);
       // get random color and send it back to the user
       userColor = colors.shift();
       connection.sendUTF(
           JSON.stringify({ type:'color', data: userColor }));
       console.log((new Date()) + ' User is known as: ' + userName
                   + ' with ' + userColor + ' color.');
     } else {
        console.log((new Date()) + ' Received Message from '
                    + userName + ': ' + message.utf8Data);

        // Message data
        var obj = {
          time: (new Date()).getTime(),
          text: htmlEntities(message.utf8Data),
          author: userName,
          color: userColor
        };
        //store message data
        history.push(obj);
        history = history.slice(-100);

        // Broadcast message to all users
        var json = JSON.stringify({ type:'message', data: obj });
        for (var i=0; i < clients.length; i++) {
          clients[i].sendUTF(json);
        }
     }
   }
  });

  // user disconnected
  connection.on('close', function(connection) {
    if (userName !== false && userColor !== false) {
      console.log((new Date()) + " Peer "
          + connection.remoteAddress + " disconnected.");

      // remove user from the list of connected clients
      clients.splice(index, 1);
      // push back user's color to be reused by another user
      colors.push(userColor);
    }
  });

});

//***** END WEBSOCKET *****//


//// CLIENT SIDE ////

$(function () {

  var content = $('#content');
  var input = $('#input');
  var status = $('#status');

  // my color assigned by the server
  var myColor = false;
  // my name sent to the server
  var myName = false;

  // if user is running mozilla then use it's built-in WebSocket
  window.WebSocket = window.WebSocket || window.MozWebSocket;

  // if browser doesn't support WebSocket, just show
  // some notification and exit
  if (!window.WebSocket) {
    content.html($('<p>',
      { text:'Sorry, but your browser doesn\'t support WebSocket.'}
    ));
    input.hide();
    $('span').hide();
    return;
  }

  var connection = new WebSocket('ws://localhost:3000/chatbox/');

  connection.onopen = function () {
    // connection is opened and ready to use
    input.removeAttr('disabled');
    status.text('Choose name:');
  };

  connection.onerror = function (error) {
    // an error occurred when sending/receiving data
    content.html($('<p>', {
      text: 'Sorry, but there\'s some problem with your '
         + 'connection or the server is down.'
    }));
  };

  // incoming message
  connection.onmessage = function (message) {
    // try to decode json (I assume that each message
    // from server is json)
    try {
      var json = JSON.parse(message.data);
    } catch (e) {
      console.log('Invalid JSON: ', message.data);
      return;
    }
    // first response from the server with user's color
    if (json.type === 'color') {
      myColor = json.data;
      status.text(myName + ': ').css('color', myColor);
      input.removeAttr('disabled').focus();
      // from now user can start sending messages
    }
    else if (json.type === 'history') { // entire message history
      // insert every single message to the chat window
      for (var i=0; i < json.data.length; i++) {
      addMessage(json.data[i].author, json.data[i].text,
          json.data[i].color, new Date(json.data[i].time));
      }
    }else if (json.type === 'message') { // it's a single message
      // let the user write another message
      input.removeAttr('disabled');
      addMessage(json.data.author, json.data.text,
                 json.data.color, new Date(json.data.time));
    } else {
      console.log('Invalid JSON: ', json);
    }
  };

  // Send message when user presses Enter key
  input.keydown(function(e) {
    if (e.keyCode === 13) {
      var msg = $(this).val();
      if (!msg) {
        return;
      }
      // send the message as an ordinary text
      connection.send(msg);
      $(this).val('');
      // disable the input field to make the user wait until server
      // sends back response
      input.attr('disabled', 'disabled');

      // the first message sent from a user is their username
      if (myName === false) {
        myName = msg;
      }
    }
  });

  // if the server doesn't respond in 3 seconds then inform user
  setInterval(function() {
    if (connection.readyState !== 1) {
      status.text('Error');
      input.attr('disabled', 'disabled').val(
          'Unable to communicate with the WebSocket server.');
    }
  }, 3000);

  // Add message to chatbox
  function addMessage(author, message, color, dt) {
    content.prepend('<p><span style="color:' + color + '">'
        + author + '</span> @ ' + (dt.getHours() < 10 ? '0'
        + dt.getHours() : dt.getHours()) + ':'
        + (dt.getMinutes() < 10
          ? '0' + dt.getMinutes() : dt.getMinutes())
        + ': ' + message + '</p>');
  }

});
