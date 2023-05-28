import WebSocket from "ws";
import { Chunk, Entity, User } from "./Interfaces";
import { Server } from "./Server";

export class Connection {
  socket: WebSocket.WebSocket;
  server: Server;
  user: User;
  entity: Entity;
  visibleChunks?: Array<Chunk>
  // newVisibleChunks: Array<number>
  // server updates visibleChunks every few seconds or so?
  // client sends state of chunks after receiving each chunk?
  // then compare that client and server connection have same chunks, then ready

  public constructor(socket: WebSocket.WebSocket, server: Server) {
    this.socket = socket;
    this.server = server;
    this.bindMethods();

    this.socket.onmessage = this.onAuthenticate;
    this.socket.onclose = this.onClose
  }

  public send(data: string): void {
    this.socket.send(data);
  }

  private async onAuthenticate(event: WebSocket.MessageEvent) {
    const user = await this.server.authenticate(event.data);
    if (!user) {
      this.socket.send(JSON.stringify({valid: false}));
      return;
    }
    this.socket.send(JSON.stringify({valid: true}));
    this.socket.onmessage = this.onMessage;
    this.user = user;
    this.server.startConnection(this);
  }

  private onMessage(event: WebSocket.MessageEvent) {
    console.log('connection.onMessage');
    this.socket.send(event.data); // echo data

    // Create input buffer for every connection/client?
    // At the beinning of each frame, server reads all client buffers.
    // Buffer can have only one move command, 
    // which is overwritten if new is received during same frame before server reads it.
    // So one movement action can be executed while one is waiting in the buffer.
    // Buffer can be cleared with cancel action?
    // How to tell client what's in the buffer, and what action is executed?

    let data: any;
    try {
      data = JSON.parse(event.data.toString());

      switch (data.type) {
      case 'input':
        const input = data.input;
      default:
        console.log('connection.onMessage invalid type');
        this.socket.close();
        break;
      }
    } catch (error) {
      console.log('connection.onMessage malformed message data');
      this.socket.close();
    }
  }

  private onClose(event: WebSocket.CloseEvent) {
    if (!this.user) {
      return;
    }
    this.server.closeConnection(this);
  }

  private bindMethods(): void {
    this.onAuthenticate = this.onAuthenticate.bind(this);
    this.onMessage = this.onMessage.bind(this);
    this.onClose = this.onClose.bind(this);
  }

  public destructor(): void {
    this.socket = null;
    this.server = null;
    this.user = null;
  }
}
