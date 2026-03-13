import { useGameState } from "../context/game-state";
import type { Slot, SlotType } from "../types";

const SECTION_ACCENT: Record<SlotType, string> = {
  weapon: "border-red-900 hover:border-red-700",
  thruster: "border-blue-900 hover:border-blue-700",
  misc: "border-gray-700 hover:border-gray-500",
};

const SECTION_LABEL: Record<SlotType, string> = {
  weapon: "Weapon",
  thruster: "Thruster",
  misc: "Misc",
};

function SlotCard({ slot, index }: { slot: Slot; index: number }) {
  return (
    <button className={`
      border rounded bg-gray-900 w-20 h-20
      flex flex-col items-center justify-center gap-1
      transition-colors cursor-pointer
      ${SECTION_ACCENT[slot.type]}
    `}>
      <span className="text-[10px] uppercase tracking-widest text-gray-500">
        {SECTION_LABEL[slot.type]} {index + 1}
      </span>
      <span className={`text-xs ${slot.item !== null ? "text-green-400" : "text-gray-700"}`}>
        {slot.item !== null ? "equipped" : "empty"}
      </span>
    </button>
  );
}

function SlotSection({ title, slots }: { title: string; slots: Slot[] }) {
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
        {title} <span className="font-normal text-gray-700">({slots.length})</span>
      </h3>
      <div className="flex flex-wrap gap-2">
        {slots.map((slot, i) => <SlotCard key={i} slot={slot} index={i} />)}
      </div>
    </section>
  );
}

export function WorkshopView() {
  const { playerShip } = useGameState();

  return <main className="p-6">
    <h2 className="text-lg font-semibold mb-6">Workshop</h2>
    <div className="space-y-8">
      <SlotSection title="Weapons" slots={playerShip.weaponSlots} />
      <SlotSection title="Thrusters" slots={playerShip.thrusterSlots} />
      <SlotSection title="Misc" slots={playerShip.miscSlots} />
    </div>
  </main>;
}
