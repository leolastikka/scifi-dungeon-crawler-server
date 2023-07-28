import { Entity } from "./Entity.js";
import { Action } from "./Interfaces.js";
import { Vector2 } from "./Math.js";

export class Chunk extends EventTarget {
  public position: Vector2;
  public size: number;
  public tiles: Array<Array<number>>;
  /** Map<networkId, entity> */
  public entities: Map<number, Entity>;

  //connections: Array<Connection>;
  // make connections listen to chunk's events
  // then broadcast chunk entities' actions through events

  constructor(position: Vector2, size: number, tiles: Array<Array<number>>) {
    super();

    this.position = position;
    this.size = size;
    this.tiles = tiles;
    this.entities = new Map();
  }

  public broadcastAction(action: Action) {
    this.dispatchEvent(new MessageEvent('action', {
      data: action
    }));
  }

  public toJSON(): any {
    return {
      position: this.position,
      tiles: this.tiles,
      size: this.size
    };
  }
}