import WebSocket from "ws";
import { Action, Entity, User } from "./Interfaces";
import { Server } from "./Server";
import { Chunk } from "./Chunk";

export class Connection {
  private socket: WebSocket.WebSocket;
  private server: Server;

  public user: User;
  /** Owned player entity. */
  public entity: Entity;
  /** Latest action send by client. */
  public actionBuffer: Action;

  /** Last center chunk that was used to calculate the area. */
  public centerChunk: Chunk;
  /** All chunks in specified radius that are synced to client. */
  public watchedChunks: Array<Chunk>;
  /** Keys of expiring chunks with expiration times. */
  public expiringChunks: Map<string, number>;

  public constructor(socket: WebSocket.WebSocket, server: Server) {
    this.socket = socket;
    this.server = server;
    this.bindMethods();

    this.centerChunk = null;
    this.watchedChunks = [];
    this.expiringChunks = new Map();

    this.socket.onmessage = this.onAuthenticate;
    this.socket.onclose = this.onClose
  }

  public send(data: string): void {
    this.socket.send(data);
  }

  private async onAuthenticate(event: WebSocket.MessageEvent): Promise<void> {
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

  private onMessage(event: WebSocket.MessageEvent): void {
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

      const action: Action = {
        type: data.type,
        networkId: this.entity.networkId
      };

      switch (data.type) {
      case 'move':
      case 'turn':
        action.direction = data.direction;
      default:
        console.log('connection.onMessage invalid type');
        this.socket.close();
        break;
      }

      this.actionBuffer = action;
    } catch (error) {
      console.log('connection.onMessage malformed message data');
      this.socket.close();
    }
  }

  public onChunkAction(event: MessageEvent): void {
    throw new Error('NOT IMPLEMENTED');
  }

  private validateMoveAction(data: any): boolean {
    return false;
  }

  private validateTurnAction(data: any): boolean {
    return false;
  }

  private onClose(event: WebSocket.CloseEvent): void {
    if (!this.user) {
      return;
    }
    this.server.closeConnection(this);
  }

  private bindMethods(): void {
    this.onAuthenticate = this.onAuthenticate.bind(this);
    this.onMessage = this.onMessage.bind(this);
    this.onChunkAction = this.onChunkAction.bind(this);
    this.onClose = this.onClose.bind(this);
  }

  public destructor(): void {
    this.socket = null;
    this.server = null;
    this.user = null;
  }
}
