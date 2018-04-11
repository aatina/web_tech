$(function () {

  var content = $('#content');
  var input = $('#input');
  var status = $('#status');

  // my name sent to the server
  var username = false;


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

  var connection = new WebSocket('ws://localhost:3000/echo');

  connection.onopen = function () {
    // connection is opened and ready to use
    input.removeAttr('disabled');
    status.text('Message: ');
  };

  connection.onerror = function (error) {
    // an error occurred when sending/receiving data
    content.html($('<p>', {
      text: 'Sorry, but there\'s some problem with your '
         + 'connection or the server is down.'
    }));
  };

  connection.onmessage = function (message) {

    if(message.data != "-1"){

      // check if json is valid
      try {
        var json = JSON.parse(message.data);
      } catch (e) {
        console.log('Invalid JSON: ', message.data);
        return;
      }

      if (json.type === 'history') { // entire message history
        // insert every single message to the chat window
        for (var i=0; i < json.data.length; i++) {
          if(json.data[i].avatar){
            avatar_url = "http://vanillicon.com/v2/" + json.data[i].avatar + ".svg"
          }
          else{
            avatar_url = "/images/default_icon.png"
          }
          addMessage(json.data[i].author, avatar_url,  json.data[i].text, new Date(json.data[i].time));
        }
      } else if (json.type === 'message') { // it's a single message
        // let the user write another message
        if(json.data.avatar){
          avatar_url = "http://vanillicon.com/v2/" + json.data.avatar + ".svg"
        }
        else{
          avatar_url = "/images/default_icon.png"
        }
        input.removeAttr('disabled').focus();
        addMessage(json.data.author, avatar_url, json.data.text, new Date(json.data.time));
      } else {
        console.log('Invalid JSON: ', json);
      }


    } else {
      console.log("not logged in")
      content.html($('<em>',
        { text:'Please log in to access the chat room'}
      ));
      input.attr('disabled', 'disabled');
      status.text('Chat disabled');
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
    }
  });

  function addMessage(author, avatar, message, dt) {
    content.append( '<a href="/user/' + author + '"><div class="chat-msg"> '
        + '<img class ="chat-image" src=' + avatar + '><span>'
        + author + '</span></a> @ ' + (dt.getHours() < 10 ? '0'
        + dt.getHours() : dt.getHours()) + ':'
        + (dt.getMinutes() < 10
          ? '0' + dt.getMinutes() : dt.getMinutes())
        + ': ' + message + '</p></div>');
  };

});
