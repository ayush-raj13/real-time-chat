import { connection } from "websocket";
import { OutgoingMessage } from "./messages/outgoingMessages";

interface User {
  name: string;
  id: string;
  connection: connection;
}

interface Room {
  users: User[];
}

export class UserManager {
  private rooms: Map<string, Room>;
  constructor() {
    this.rooms = new Map<string, Room>()
  }

  addUser(name: string, userId: string, roomId: string, socket: connection) {
    if (!this.rooms.get(roomId)) {
      this.rooms.set(roomId, {
        users: [],
      });
    }
    this.rooms.get(roomId)?.users.push({
      id: userId,
      name,
      connection: socket,
    });

    socket.on('close', (reasonCode, description) => {
      this.removeUser(roomId, userId);
    });
  }

  removeUser(roomId: string, userId: string) {
    console.log("user removed");
    const users = this.rooms.get(roomId)?.users;
    if (users) {
      users.filter(({ id }) => id !== userId);
    }
  }

  getUser(roomId: string, userId: string): User | null {
    const user = this.rooms.get(roomId)?.users.find(({ id }) =>  id === userId);
    return user ?? null;
  }

  broadcast(roomId: string, userId: string, message: OutgoingMessage) {
    const user = this.getUser(roomId, userId);
    if (!user) {
      console.error("User not found");
      return;
    }
    const room = this.rooms.get(roomId);
    if (!room) {
      console.error("Room not found");
      return;
    }
    room.users.forEach(({ connection, id }) => {
      console.log("outgoing message " + JSON.stringify(message));
      connection.sendUTF(JSON.stringify(message));
    });
  }
}