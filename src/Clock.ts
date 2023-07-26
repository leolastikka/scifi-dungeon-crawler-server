export class Clock {
  private startMs: number;
  private totalMs: number;
  private deltaMs: number;
  private prevMs: number;

  public constructor() {
    this.startMs = Date.now();
    this.totalMs = 0;
    this.deltaMs = 0;
    this.prevMs = this.startMs;
  }

  /** Must be called only once at the start of each server update cycle. */
  public update() {
    let newMs = Date.now();
    this.deltaMs = newMs - this.prevMs;
    this.totalMs = newMs - this.startMs;
    this.prevMs = newMs;
  }

  public get deltaTime() {
    if (this.deltaMs > 1000) return 0;
    return this.deltaMs / 1000;
  }

  public get totalTime() {
    return this.totalMs / 1000;
  }
}
