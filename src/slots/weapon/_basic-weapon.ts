import { Angle } from "../../rendering/utils";
import { SlotType } from "../../types";
import { SlotItem } from "../_slot-item";

export class BasicWeaponSlot extends SlotItem {
  static readonly id = "basic-weapon-slot";
  readonly slotType = SlotType.weapon;
  readonly id = BasicWeaponSlot.id;
  readonly name = "Basic Weapon Slot";
  readonly maxHealth = 10;
  readonly mass = 5;

  currentAngle: Angle = Angle.zero;
}
