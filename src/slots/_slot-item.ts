import { Angle } from "../rendering/utils";

export abstract class SlotItem {
  abstract readonly id: string;
  abstract readonly name: string;
  readonly maxHealth: number = 1;
  readonly mass: number = 1;

  private mountAngle: Angle = Angle.zero;
}
