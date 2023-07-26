

export class Vector2 {
  public x: number;
  public y: number;

  public constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  public add(other: Vector2): Vector2 {
    this.x += other.x;
    this.y += other.y;
    return this;
  }

  public sub(other: Vector2): Vector2 {
    this.x -= other.x;
    this.y -= other.y;
    return this;
  }

  public length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  public normalize(): Vector2 {
    return this.divideScalar(this.length());
  }

  public divideScalar(scalar: number): Vector2 {
    this.x /= scalar;
    this.y /= scalar;
    return this;
  }

  public multiplyScalar(scalar: number): Vector2 {
    this.x *= scalar;
    this.y *= scalar;
    return this;
  }

  public rotateAngle(radians: number): Vector2 {
    this.x = Math.cos(radians) * this.x - Math.sin(radians) * this.y;
    this.y = Math.sin(radians) * this.x + Math.cos(radians) * this.y;
    return this;
  }

  /**
   * @returns New instance of Vector2.
   */
  public clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  /**
   * @param radians 
   * @returns New instance of Vector2.
   */
  public static fromAngle(radians: number): Vector2 {
    return new Vector2(Math.cos(radians), Math.sin(radians));
  }
}