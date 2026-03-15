import { createContext } from "react";
import type { ShipLoadout } from "../../types";
import type { SlotItem } from "../../slots";
import { CH_SLPShip } from "../../ships/republic";
import { BasicThrusterSlot } from "../../slots";

export type GameStateContextType = {
  time: number;
  incrementTime: () => void;
  playerShip: ShipLoadout;
  setPlayerShip: React.Dispatch<React.SetStateAction<ShipLoadout>>;
  inventory: SlotItem[];
  setInventory: React.Dispatch<React.SetStateAction<SlotItem[]>>;
};

const defaultInventory: SlotItem[] = [
  new BasicThrusterSlot(),
  new BasicThrusterSlot(),
  new BasicThrusterSlot(),
  new BasicThrusterSlot(),
  new BasicThrusterSlot(),
  new BasicThrusterSlot(),
  new BasicThrusterSlot(),
  new BasicThrusterSlot(),
  new BasicThrusterSlot(),
  new BasicThrusterSlot(),
  new BasicThrusterSlot(),
  new BasicThrusterSlot(),
  new BasicThrusterSlot(),
  new BasicThrusterSlot(),
  new BasicThrusterSlot(),
  new BasicThrusterSlot(),
  new BasicThrusterSlot(),
  new BasicThrusterSlot(),
  new BasicThrusterSlot(),
  new BasicThrusterSlot(),
];

export const defaultGameStateContext: GameStateContextType = {
  time: 0,
  incrementTime: () => { },
  playerShip: { ...CH_SLPShip },
  setPlayerShip: () => { },
  inventory: defaultInventory,
  setInventory: () => { },
};

export const GameStateContext = createContext<GameStateContextType>(defaultGameStateContext);
