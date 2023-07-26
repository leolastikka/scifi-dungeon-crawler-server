import { Chunk } from "./Chunk.js";
import { Connection } from "./Connection.js";
import { Action, UpdateData } from "./Interfaces.js";
import { Vector2 } from "./Math.js";
import { World } from "./World.js";

/** Units per second. */
const ENTITY_MOVE_SPEED = 2.0;
/** Radians per second. */
const ENTITY_TURN_SPEED = Math.PI;

export enum EntityState {
  Idle,
  Move,
  Turn
}

export class Entity {
  private state: EntityState;
  private world: World;
  public removed: boolean;
  public networkId: number;
  public position: Vector2;
  /** Look direction in radians. */
  public orientation: number;

  public action: Action;
  public chunk: Chunk;

  /** Unique identifier for connecting entity with user. */
  public uuid: string;
  public spawnerId: number;
  public class: string; // extend Entity to make subclasses for these?
  /** Owner connection if this is player entity. */
  public connection: Connection;

  public constructor(networkId: number, position: Vector2, orientation: number, world: World) {
    this.networkId = networkId;
    this.position = position;
    this.orientation = orientation;

    this.state = EntityState.Idle;
    this.removed = false;
  }

  public update(updateData: UpdateData): void {
    switch(this.state) {
    case EntityState.Idle:
      this.updateIdle(updateData);
      break;
    case EntityState.Move:
      this.updateMove(updateData);
      break;
    case EntityState.Turn:
      this.updateTurn(updateData);
      break;
    }
  }

  private updateIdle(updateData: UpdateData): void {}

  private updateMove(updateData: UpdateData): void {
    const updateDistance = this.action.speed * updateData.clock.deltaTime;
    let diff: Vector2 = this.action.endPosition.clone().sub(this.position);

    if (updateDistance < diff.length()) {
      // if end position is not reached
      diff.normalize();
      diff.multiplyScalar(updateDistance);
      this.position.add(diff);
    }
    else {
      // if end position is reached
      this.position = this.action.endPosition.clone();
      this.endAction();
    }
  }

  private updateTurn(updateData: UpdateData): void {
    const turnAngle = this.action.speed * updateData.clock.deltaTime;
    const rotation = this.action.endOrientation - this.orientation;
    
    if (turnAngle < rotation) {
      // if end orientation is not reached
      this.orientation += turnAngle;
    }
    else {
      // if end orientation is reached
      this.orientation = this.action.endOrientation;
      this.endAction();
    }
  }

  /**
   * @param {Action} action
   * @returns If a new entity action was started.
   */
  public startAction(action: Action): boolean {
    // For now previous actions can't be overwritten.
    if (this.action) {
      return false;
    }

    if (action.type === 'move') {
      let movement: Vector2;
      let forward = Vector2.fromAngle(this.orientation);

      if (action.direction === 'forward') {
        movement = forward.clone();
      }
      else if (action.direction === 'back') {
        movement = forward.clone().multiplyScalar(-1);
      }
      else if (action.direction === 'left') {
        movement = forward.clone().rotateAngle(Math.PI / 2);
      }
      else if (action.direction === 'right') {
        movement = forward.clone().rotateAngle(-Math.PI / 2);
      }

      action.startPosition = this.position.clone();
      action.endPosition = this.position.clone().add(movement);
      action.speed = ENTITY_MOVE_SPEED;
      this.action = action;
      this.state = EntityState.Move;
    }
    else if (action.type === 'turn') {
      let rotation: number;

      if (action.direction === 'left') {
        rotation = Math.PI / 2;
      }
      else if (action.direction === 'right') {
        rotation = -Math.PI / 2;
      }
      
      action.startOrientation = this.orientation;
      action.endOrientation = this.orientation + rotation;
      action.speed = ENTITY_TURN_SPEED;
      this.action = action;
      this.state = EntityState.Turn;
    }
    else {
      return false;
    }

    // Send action to everyone listening to entity's chunk.
    this.chunk.broadcastAction(action);
    return true;
  }

  private endAction(): void {
    if (this.action.type === 'move') {
      // If entity is a player entity.
      if (this.connection) {
        // Update entity's connection's watched chunks.
        this.world.updateWatchedChunks(this.connection);
      }
    }

    // remove action and reset state
    this.action = null;
    this.state = EntityState.Idle;
  }

  public toJSON(): any {
    return {
      networkId: this.networkId,
      position: this.position,
      orientation: this.orientation
    };
  }

  public destructor(): void {
    this.position = null;
    this.action = null;
    this.chunk = null;
    this.connection = null;
    this.world = null;
  }
}
