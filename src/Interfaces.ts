import { Chunk } from "./Chunk.js";
import { Clock } from "./Clock.js";
import { Connection } from "./Connection.js";
import { Entity } from "./Entity.js";
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

export enum EntityState {
  Idle,
  Move,
  Turn
}

export interface Action {
  type: string;
  /** Owning entity networkId. */
  networkId: number;
  direction?: string;
  targetId?: number;
  endTime?: number;
  startPosition?: Vector2;
  endPosition?: Vector2;
  startOrientation?: number;
  endOrientation?: number;
  speed?: number;
}

export interface UpdateData {
  clock: Clock;
  entities: Map<number, Entity>;
}
