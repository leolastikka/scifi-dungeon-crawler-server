import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import url from 'url';
import { Chunk, Entity } from './Interfaces.js';
import { Vector2 } from './Math.js';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const WORLD_PATH = path.normalize(`${__dirname}/../assets/world.json`);
const TILES_LAYER_NAME = 'tiles';
const ENTITIES_LAYER_NAME = 'entities';

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
  private chunks: Map<string, Chunk>;
  private entities: Array<Entity>;

  public constructor() {
    this.bindMethods();
    this.chunks = new Map();
    this.entities = [];
  }

  public getEntityByUuid(uuid: string): Entity {
    return this.entities.find(e => e.uuid === uuid);
  }

  public getChunkByPosition(position: Vector2): Chunk {
    const chunkPos: Vector2 = new Vector2(
      Math.floor(position.x / this.chunkSize) * this.chunkSize,
      Math.floor(position.y / this.chunkSize) * this.chunkSize
    );
    return this.chunks.get(`${chunkPos.x},${chunkPos.y}`);
  }

  public getVisibleChunks(entity: Entity): Array<Chunk> {
    const chunks = [];
    this.chunks.forEach((value: Chunk, key: string) => {
      chunks.push(value);
    });
    return chunks;
  }

  public createEntity(data: any): void {

  }

  public createNewUserEntity(): string {
    const startPosition: Vector2 = new Vector2(4, 1);

    const pos: Vector2 = new Vector2(
      startPosition.x,
      startPosition.y
    );
    const chunk: Chunk = this.getChunkByPosition(pos);

    const entity: Entity = {
      uuid: crypto.randomUUID(),
      networkId: World.entityId++,
      position: pos,
      class: 'player',
      chunk: chunk
    };
    this.entities.push(entity);
    chunk.entities.push(entity);

    return entity.uuid;
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

      const chunk: Chunk = {
        pos: new Vector2(c.x, c.y),
        size: this.chunkSize,
        tiles: tiles,
        entities: []
      };
      this.chunks.set(`${c.x},${c.y}`, chunk);
    });
  }

  private parseEntitiesLayer(layer): void {
    layer.objects.forEach((o: WorldFileObject) => {
      const pos: Vector2 = this.pixelPosToTilePos(o.x, o.y);
      const chunk: Chunk = this.getChunkByPosition(pos);

      const entity: Entity = {
        networkId: World.entityId++,
        position: pos,
        class: o.class,
        chunk: chunk
      }
      this.entities.push(entity);
      chunk.entities.push(entity);
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