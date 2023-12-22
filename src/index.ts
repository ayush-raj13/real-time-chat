import { Message, server as WebSocketServer, connection } from 'websocket';
import http from 'http';
import { IncomingMessage, InitMessageType, SupportedMessage, UpvoteMessageType, UserMessageType } from './messages/incomingMessages';
import { OutgoingMessage, SupportedMessage as OutgoingSupportedMessage } from './messages/outgoingMessages';
import { UserManager } from './UserManager';
import { InMemoryStore } from './store/InMemoryStore';

const server = http.createServer(function(request: any, response: any) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});
const userManager = new UserManager();
const store = new InMemoryStore();

server.listen(8080, function() {
    console.log((new Date()) + ' Server is listening on port 8080');
});

const wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false
});

function originIsAllowed(origin : string) {
  // put logic here to detect whether the specified origin is allowed.
  return true;
}

wsServer.on('request', function(request) {
    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin
      request.reject();
      console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
      return;
    }
    
    var connection = request.accept('echo-protocol', request.origin);
    console.log((new Date()) + ' Connection accepted.');
    connection.on('message', function(message) {
        // Todo add rate limiting logic here
        if (message.type === 'utf8') {
            try {
                console.log("inside with message" + message.utf8Data);
                messageHandler(connection, JSON.parse(message.utf8Data));
            } catch (error) {
                
            }
            // console.log('Received Message: ' + message.utf8Data);
            // connection.sendUTF(message.utf8Data);
        }
    });
});

function messageHandler(ws: connection, message: IncomingMessage): void {
  console.log("incoming message " + JSON.stringify(message));
  const { type, payload } = message;

  switch (type) {
    case SupportedMessage.JoinRoom:
      // handle JoinRoom message with payload as InitMessageType
      userManager.addUser(payload.name, payload.userId, payload.roomId, ws);
      break;
    case SupportedMessage.SendMessage:
      // handle SendMessage message with payload as UserMessageType
      const user = userManager.getUser(payload.roomId, payload.userId);
      if (!user) {
        console.error("User not found in the db");
        return;
      }
      let chat = store.addChat(payload.userId, user.name, payload.roomId, payload.message);
      if (!chat) {
        return;
      }

      // broadcast logic here
      const outgoingAddChatPayload: OutgoingMessage = {
        type: OutgoingSupportedMessage.AddChat,
        payload: {
            roomId: payload.roomId,
            message: payload.message,
            name: user.name,
            upvotes: 0,
            chatId: chat.id,
        }
      }
      userManager.broadcast(payload.roomId, payload.userId, outgoingAddChatPayload);
      break;
    case SupportedMessage.UpvoteMessage:
      // handle UpvoteMessage message with payload as UpvoteMessageType
      const upvotedChat = store.upvote(payload.userId, payload.roomId, payload.chatId);
      if (!upvotedChat) {
        return;
      }

      const outgoingUpdateChatPayload: OutgoingMessage = {
        type: OutgoingSupportedMessage.UpdateChat,
        payload: {
            chatId: payload.chatId,
            roomId: payload.roomId,
            upvotes: upvotedChat.upvotes.length,
        }
      }
      userManager.broadcast(payload.roomId, payload.userId, outgoingUpdateChatPayload);
      break;
    default:
      // handle other cases if needed
      break;
  }
}