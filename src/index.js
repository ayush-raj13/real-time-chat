"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const websocket_1 = require("websocket");
const http_1 = __importDefault(require("http"));
const incomingMessages_1 = require("./messages/incomingMessages");
const outgoingMessages_1 = require("./messages/outgoingMessages");
const UserManager_1 = require("./UserManager");
const InMemoryStore_1 = require("./store/InMemoryStore");
const server = http_1.default.createServer(function (request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});
const userManager = new UserManager_1.UserManager();
const store = new InMemoryStore_1.InMemoryStore();
server.listen(8080, function () {
    console.log((new Date()) + ' Server is listening on port 8080');
});
const wsServer = new websocket_1.server({
    httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false
});
function originIsAllowed(origin) {
    // put logic here to detect whether the specified origin is allowed.
    return true;
}
wsServer.on('request', function (request) {
    if (!originIsAllowed(request.origin)) {
        // Make sure we only accept requests from an allowed origin
        request.reject();
        console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
        return;
    }
    var connection = request.accept('echo-protocol', request.origin);
    console.log((new Date()) + ' Connection accepted.');
    connection.on('message', function (message) {
        // Todo add rate limiting logic here
        if (message.type === 'utf8') {
            try {
                messageHandler(connection, JSON.parse(message.utf8Data));
            }
            catch (error) {
            }
            // console.log('Received Message: ' + message.utf8Data);
            // connection.sendUTF(message.utf8Data);
        }
    });
    connection.on('close', function (reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
    });
});
function messageHandler(ws, message) {
    const { type, payload } = message;
    switch (type) {
        case incomingMessages_1.SupportedMessage.JoinRoom:
            // handle JoinRoom message with payload as InitMessageType
            userManager.addUser(payload.name, payload.userId, payload.roomId, ws);
            break;
        case incomingMessages_1.SupportedMessage.SendMessage:
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
            const outgoingAddChatPayload = {
                type: outgoingMessages_1.SupportedMessage.AddChat,
                payload: {
                    roomId: payload.roomId,
                    message: payload.message,
                    name: user.name,
                    upvotes: 0,
                    chatId: chat.id,
                }
            };
            userManager.broadcast(payload.roomId, payload.userId, outgoingAddChatPayload);
            break;
        case incomingMessages_1.SupportedMessage.UpvoteMessage:
            // handle UpvoteMessage message with payload as UpvoteMessageType
            const upvotedChat = store.upvote(payload.userId, payload.roomId, payload.chatId);
            if (!upvotedChat) {
                return;
            }
            const outgoingUpdateChatPayload = {
                type: outgoingMessages_1.SupportedMessage.UpdateChat,
                payload: {
                    chatId: payload.chatId,
                    roomId: payload.roomId,
                    upvotes: upvotedChat.upvotes.length,
                }
            };
            userManager.broadcast(payload.roomId, payload.userId, outgoingUpdateChatPayload);
            break;
        default:
            // handle other cases if needed
            break;
    }
}
