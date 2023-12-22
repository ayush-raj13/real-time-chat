type UserId = string;

export interface Chat {
  id: string;
  userId: UserId;
  name: string;
  message: string;
  upvotes: UserId[];
}

export abstract class Store {
  constructor() {

  }
  initRoom(roomId: string) {

  }

  getChats(roomId: string, limit: number, offset: number) {

  }

  addChat(userId: string, name: string, roomId: string, message: string) {

  }

  upvote(userId: string, roomId: string, chatId: string) {

  }
}