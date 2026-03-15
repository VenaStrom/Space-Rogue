import { SlotItem } from "../_slot-item";

export class BasicThrusterSlot extends SlotItem {
  static readonly id = "basic-thruster";
  readonly id = BasicThrusterSlot.id;
  readonly name = "Basic Thruster";

  readonly maxHealth: number = 10;
  readonly mass: number = 5;

  readonly thrust: number = 1;
  readonly maxTurnRate: number = Math.PI / 2; // radians per second

  readonly trailLength: number = 20;
  readonly trailWidth: number = 5;
  readonly trailColor: (a: number) => string = (a) => `rgba(128, 216, 255, ${a})`;
}
