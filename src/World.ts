import fs from 'fs';
import path from 'path';
import url from 'url';
import { UpdateData } from './Interfaces.js';
import { Vector2 } from './Math.js';
import { Connection } from './Connection.js';
import { Chunk } from './Chunk.js';
import { Clock } from './Clock.js';
import { Entity } from './Entity.js';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const WORLD_PATH = path.normalize(`${__dirname}/../assets/world.json`);
const TILES_LAYER_NAME = 'tiles';
const ENTITIES_LAYER_NAME = 'entities';
/** How far away chunks are loaded to client around center chunk. */
const CONNECTION_AREA_RADIUS = 1;
/** Time in seconds. */
const CHUNK_EXPIRATION_TIME = 5; // make longer after testing

interface WorldFileChunk {
  data: Array<number>;
  height: number;
  width: number;
  x: number;
  y: number;
}

interface WorldFileObject {
  id: number;
  class: string;
  x: number;
  y: number;
}

interface WorldFileLayer {
  name: string
  chunks?: Array<WorldFileChunk>;
  objects?: Array<WorldFileObject>;
}

interface WorldFile {
  layers: Array<WorldFileLayer>;
  tilewidth: number;
}

export class World {
  private static entityId: number = 0;

  private tileSize: number;
  private chunkSize: number;
  /** Map<'x,y', chunk> */
  private chunks: Map<string, Chunk>;
  /** Map<networkId, entity> */
  private entities: Map<number, Entity>;
  private entityRemoved: boolean;
  private clock: Clock;

  public constructor() {
    this.bindMethods();
    this.chunks = new Map();
    this.entities = new Map();
    this.entityRemoved = false;
    this.clock = new Clock();
  }

  // public getEntityByUuid(uuid: string): Entity {
  //   for (let value of this.entities.values()) {
  //     if (value.uuid === uuid) {
  //       return value;
  //     }
  //   }
  //   return null;
  // }

  public getEntityByNetworkId(networkId: number): Entity {
    return this.entities.get(networkId);
  }

  // getChunkKeyByPosition(position: Vector2): string {
  //   const chunkPos: Vector2 = new Vector2(
  //     Math.floor(position.x / this.chunkSize) * this.chunkSize,
  //     Math.floor(position.y / this.chunkSize) * this.chunkSize
  //   );
  //   return `${chunkPos.x},${chunkPos.y}`;
  // }

  /** Get chunk by entity position inside chunk. */
  public getChunkByPosition(position: Vector2): Chunk {
    const chunkPos: Vector2 = new Vector2(
      Math.floor(position.x / this.chunkSize) * this.chunkSize,
      Math.floor(position.y / this.chunkSize) * this.chunkSize
    );
    return this.chunks.get(`${chunkPos.x},${chunkPos.y}`);
  }

  public updateWatchedChunks(connection: Connection): Array<Chunk> {
    const centerChunk: Chunk = this.getChunkByPosition(connection.entity.position);

    // Check if player entity is still inside previous chunk.
    if (centerChunk === connection.centerChunk) {
      return;
    }

    // Get all chunk positions in a radius around center.
    const chunksInRadius: Array<Chunk> = [];
    const radius: number = CONNECTION_AREA_RADIUS;
    for (let x = -radius; x < radius + 1; x++) {
      for (let y = -radius; y < radius + 1; y++) {
        const keyX = x + centerChunk.position.x;
        const keyY = y + centerChunk.position.y
        const key = `${keyX},${keyY}`;
        chunksInRadius.push(this.chunks.get(key));
      }
    }

    // List what chunks need to be added and removed.
    const oldChunks = connection.watchedChunks;
    const newChunks = chunksInRadius.filter(c => c);

    const chunksToAdd = newChunks.filter(c => !oldChunks.includes(c));
    const chunksToRemove = oldChunks.filter(c => !newChunks.includes(c));

    // List entities that need to be sent.
    let entitiesToSend: Array<Entity> = [];
    for (let chunk of chunksToAdd) {
      const entities: Array<Entity> = Array.from(chunk.entities.values())
      entitiesToSend = entitiesToSend.concat(entities);

      // Add action event listener to chunk
      chunk.addEventListener('action', connection.onChunkAction);
    }

    // Set expiring chunks.
    for (let chunk of chunksToRemove) {
      const key = `${chunk.position.x},${chunk.position.y}`;
      const value = this.clock.totalTime + CHUNK_EXPIRATION_TIME;
      connection.expiringChunks.set(key, value);
    }

    // Cancel expiring chunk if moved back to its area.
    for (let chunk of chunksToAdd) {
      const key = `${chunk.position.x},${chunk.position.y}`;
      if (connection.expiringChunks.get(key)) {
        connection.expiringChunks.delete(key);
      }
    }

    // Add new chunks to connections list.
    connection.watchedChunks = connection.watchedChunks.concat(chunksToAdd);

    // Send addChunks message.
    connection.send(JSON.stringify({
      type: 'addChunks',
      chunks: chunksToAdd
    }));

    // Send addEntities message.
    connection.send(JSON.stringify({
      type: 'addEntities',
      entities: entitiesToSend
    }));
  }

  public updateExpiringChunks(connection: Connection): void {
    const chunksToRemove: Array<Chunk> = [];
    const entitiesToRemove: Array<Entity> = [];

    // Check if connection has any expiring chunks
    for (let entry of connection.expiringChunks) {
      if (this.clock.totalTime >= entry[1]) {
        const chunk = this.chunks.get(entry[0])
        chunksToRemove.push(chunk);

        for (let entity of chunk.entities.values()) {
          entitiesToRemove.push(entity);
        }

        // Remove chunk action listener.
        chunk.removeEventListener('action', connection.onChunkAction);
      }
    }

    if (!chunksToRemove.length) {
      return;
    }
  
    // Send removeChunks message
    connection.send(JSON.stringify({
      type: 'removeChunks',
      chunkIds: chunksToRemove.map(c => `${c.position.x},${c.position.y}`)
    }));

    if (!entitiesToRemove.length) {
      return;
    }
  
    // Send removeEntities message
    connection.send(JSON.stringify({
      type: 'removeEntities',
      entityIds: entitiesToRemove.map(e => e.networkId)
    }));
  }

  public update(): void {
    // Update time at start of each cycle.
    this.clock.update();

    // All data that is needed by entities when updated.
    const updateData: UpdateData = {
      clock: this.clock,
      entities: this.entities
    };

    // Process all entities.
    for (let entity of this.entities.values()) {
      entity.update(updateData);
    }

    // Remove entities if needed.
    if (!this.entityRemoved) {
      return
    }
    for (let entity of this.entities.values()) {
      if (entity.removed) {
        this.removeEntity(entity);
      }
    }
  }

  public createNewUserEntity(): number {
    const startPosition: Vector2 = new Vector2(4, 1);
    const startOrientation: number = Math.PI;

    const chunk: Chunk = this.getChunkByPosition(startPosition);

    const entity: Entity = new Entity(
      World.entityId++,
      startPosition,
      startOrientation,
      this
    );
    entity.class = 'player'
    entity.chunk = chunk;

    this.entities.set(entity.networkId, entity);
    chunk.entities.set(entity.networkId, entity);

    return entity.networkId;
  }

  public markEntityRemoved(entity: Entity): void {
    entity.removed = true;
    this.entityRemoved = true;
  }

  private removeEntity(entity: Entity): void {
    // remove entity form world
    this.entities.delete(entity.networkId);
    // remove entity from chunk
    entity.chunk.entities.delete(entity.networkId);
  }

  public async load(): Promise<void> {
    return new Promise((resolve: (any) => void, reject: (any) => void) => {
      fs.readFile(WORLD_PATH, (error: NodeJS.ErrnoException, data: Buffer) => {
        if (error) {
          reject(error);
        }
        resolve(data);
      })
    })
    .then((data: Buffer) => {
      const worldFile: WorldFile = JSON.parse(data.toString());

      this.tileSize = worldFile.tilewidth;
      const tilesLayer = worldFile.layers.find((layer: WorldFileLayer) => {
        return layer.name === TILES_LAYER_NAME;
      });
      const entitiesLayer = worldFile.layers.find((layer: WorldFileLayer) => {
        return layer.name === ENTITIES_LAYER_NAME;
      });
      this.chunkSize = tilesLayer.chunks[0].width;

      this.parseTilesLayer(tilesLayer);
      this.parseEntitiesLayer(entitiesLayer);
    });
  }

  private parseTilesLayer(layer: WorldFileLayer): void {
    layer.chunks.forEach((c: WorldFileChunk) => {
      const tiles = [];
      const dataLength = c.data.length;
      for(let i = 0; i < dataLength; i += this.chunkSize) {
        tiles.push(c.data.slice(i, i + this.chunkSize));
      }

      const chunk: Chunk = new Chunk(
        new Vector2(c.x, c.y),
        this.chunkSize,
        tiles,
      );
      this.chunks.set(`${c.x},${c.y}`, chunk);
    });
  }

  private parseEntitiesLayer(layer): void {
    layer.objects.forEach((o: WorldFileObject) => {
      const pos: Vector2 = this.pixelPosToTilePos(o.x, o.y);
      const chunk: Chunk = this.getChunkByPosition(pos);

      const entity: Entity = new Entity(
        World.entityId++,
        pos,
        0,
        this
      );
      entity.class = o.class;
      entity.chunk = chunk;

      this.entities.set(entity.networkId, entity);
      chunk.entities.set(entity.networkId, entity);
    });
  }

  private pixelPosToTilePos(x: number, y: number): Vector2 {
    return new Vector2(
      Math.floor(x / this.tileSize),
      Math.floor(y / this.tileSize)
    );
  }

  private bindMethods(): void {
    this.parseTilesLayer = this.parseTilesLayer.bind(this);
  }
}