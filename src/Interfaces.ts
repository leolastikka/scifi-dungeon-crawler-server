import { Vector2 } from "./Math.js";

export interface LoginData {
  username: string;
  password: string;
}

export interface User {
  id: number;
  username: string;
  password?: string;
  entityUuid?: string;
  data?: any;
}

export interface Entity {
  uuid?: string;
  spawnerId?: number;
  networkId?: number;
  position: Vector2;
  class: string;
  chunk: Chunk;
}

export interface Chunk {
  pos: Vector2;
  size: number;
  tiles: Array<Array<number>>;
  entities: Array<Entity>;
}
