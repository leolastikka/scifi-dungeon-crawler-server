import WebSocket from "ws";
import { Action } from "./Action.js";
import { Entity, User } from "./Interfaces.js";
import { Database } from "./Database.js";
import { World } from "./World.js";
import { Connection } from "./Connection.js";

export class Server {
  private connections: Array<Connection>;
  private inputQueue: Array<Action>;

  private database: Database;
  private world: World;

  public constructor() {
    this.connections = [];
    this.inputQueue = [];
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

    // read input queue
    // internal input queue and each connection buffer?

    // process actions
      // on move action, check if connection's visibleChunks have to be updated?

    // send updates to users
  }

  public onWebsocketConnection(socket: WebSocket.WebSocket): void {
    console.log('server.onWebsocketConnection websocket unauthenticated');
    const connection = new Connection(socket, this);
    this.connections.push(connection);
  }

  public startConnection(connection: Connection): void {
    console.log('server.startConnection');
    connection.entity = this.world.getEntityByUuid(connection.user.entityUuid);
    connection.visibleChunks = this.world.getVisibleChunks(connection.entity);

    const chunksToSend = [];
    const entitiesToSend = [];

    connection.visibleChunks.forEach(chunk => {
      chunk.entities.forEach(entity => {
        const filteredEntity = structuredClone(entity);
        delete filteredEntity.chunk;
        delete filteredEntity.spawnerId;
        delete filteredEntity.uuid;
        entitiesToSend.push(filteredEntity);
      });

      const filteredChunk = structuredClone(chunk);
      delete filteredChunk.entities;
      chunksToSend.push(filteredChunk);
    });

    
    connection.send(JSON.stringify({
      type: 'addChunks',
      chunks: chunksToSend
    }));
    connection.send(JSON.stringify({
      type: 'addEntities',
      entities: entitiesToSend
    }));
    connection.send(JSON.stringify({
      type: 'userEntity',
      networkId: connection.entity.networkId
    }));
  }

  public closeConnection(connection: Connection): void {
    this.connections = this.connections.filter(c => c !== connection);
    connection.destructor();
  }

  public async authenticate(data: WebSocket.Data): Promise<User> {
    const user = await this.database.authenticate(data);
    if (!user) {
      return null;
    }

    if (!user.entityUuid) {
      user.entityUuid = this.world.createNewUserEntity();
      user.data = {
        skills: {},
        items: {},
        state: {}
      };
      await this.database.updateUser(user.id, {
        entityUuid: user.entityUuid,
        data: user.data
      });
    }

    return user;
  }

  private bindMethods(): void {
    this.update = this.update.bind(this);
    this.onWebsocketConnection = this.onWebsocketConnection.bind(this);
  }
}
