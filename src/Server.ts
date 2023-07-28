import WebSocket from "ws";
import { Action, UpdateData, User } from "./Interfaces.js";
import { Database } from "./Database.js";
import { World } from "./World.js";
import { Connection } from "./Connection.js";

export class Server {
  private connections: Array<Connection>;
  private actions: Array<Action>;

  private database: Database;
  private world: World;

  public constructor() {
    this.connections = [];
    this.actions = [];
    this.world = new World();
    this.database = new Database();
    this.bindMethods();
  }

  public async start(): Promise<void> {
    await this.database.connect();
    await this.world.load();
    this.update();
  }

  private async update(): Promise<void> {
    setTimeout(this.update, 100);

    // Check all connections.
    for (let connection of this.connections.values()) {
      // Check if connection has expiring chunks.
      this.world.updateExpiringChunks(connection);

      // Read action from connection buffer.
      const action = connection.actionBuffer;
      if (!action) {
        break;
      }
      console.log('Server.update(): connection.actionBuffer has action:');
      console.log(action);

      // Start new action if no previous action.
      const entity = this.world.getEntityByNetworkId(action.networkId);
      if (entity.startAction(action)) {
        connection.actionBuffer = null;
      }
    }

    // Update world. New actions are sent to client inside world.
    this.world.update();
  }

  public onWebsocketConnection(socket: WebSocket.WebSocket): void {
    console.log('Server.onWebsocketConnection(): unauthenticated');
    const connection = new Connection(socket, this);
    this.connections.push(connection);
  }

  /** Called by connection after user is authenticated. */
  public startConnection(connection: Connection): void {
    console.log('Server.startConnection()');

    // Set owner player entity to connection.
    connection.entity = this.world.getEntityByNetworkId(connection.user.entityId);

    // Send chunks and entities to client.
    this.world.updateWatchedChunks(connection);

    // Finally send player entity network id with ready message.
    connection.send(JSON.stringify({
      type: 'playerReady',
      networkId: connection.entity.networkId
    }));
  }

  /** Called by connection after client or server disconnects. */
  public closeConnection(connection: Connection): void {
    // remove player entity from world and chunk
    this.world.markEntityRemoved(connection.entity);
    connection.entity.connection = null;
    connection.entity = null;

    // remove connection from chunks or remove listeners from chunks
    for (let chunk of connection.watchedChunks) {
      chunk.removeEventListener('action', connection.onChunkAction);
    }
    connection.watchedChunks = [];

    // remove connection
    this.connections = this.connections.filter(c => c !== connection);
    connection.destructor();
  }

  public async authenticate(data: WebSocket.Data): Promise<User> {
    const user = await this.database.authenticate(data);
    if (!user) {
      return null;
    }

    if (!user.entityId) {
      user.entityId = this.world.createNewUserEntity();
      console.log('Server.authenticate(): creating new entity: ' + user.entityId);
      user.data = {
        skills: {},
        items: {},
        state: {}
      };
      // Don't save entity id to user as new entity is created on every login.
      // await this.database.updateUser(user.id, {
      //   entityUuid: user.entityId,
      //   data: user.data
      // });
    }
    else { console.log('FOUND USER WITH UUID: ' + user.entityId) }

    return user;
  }

  private bindMethods(): void {
    this.update = this.update.bind(this);
    this.onWebsocketConnection = this.onWebsocketConnection.bind(this);
  }
}
