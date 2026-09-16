export type ChaseType = "blob" | "remetons";
export type ChaseState = { start: number; type: ChaseType };
/** Additive room-speed ladder: Room 25 = 1.5x, Room 26 = 3x, Room 27 = 4.5x. */
export function blobChaseMultiplier(room: number) {
  return Math.max(1.5, (room - 24) * 1.5);
}
export function scheduledChase(room: number): ChaseState | null {
  const start = Math.floor(room / 25) * 25;
  return start >= 25 && start < 200 && room < start + 5 ? { start, type: "blob" } : null;
}
export function canRollRemetons(room: number) {
  return room > 5 && room <= 195 && Array.from({length: 5}, (_, i) => room + i)
    .every(r => r !== 32 && !scheduledChase(r));
}
export function chaseForRoom(room: number, previous: ChaseState | null, roll: number, banished = false): ChaseState | null {
  const scheduled = scheduledChase(room);
  if (scheduled) return scheduled;
  if (previous && room >= previous.start && room < previous.start + 5) return previous;
  return !banished && canRollRemetons(room) && roll < 0.02 ? {start: room, type: "remetons"} : null;
}
export function chaseRoomRules(room: number, chase: ChaseState) {
  const stage = room - chase.start + 1;
  const level = Math.min(7, Math.max(1, Math.floor(chase.start / 25)));
  const length = 70 + level * 5 + stage * 2;
  return {stage, level, length, resonators: 4, specimens: 5,
    speed: 3.15 + level * 0.105 + stage * 0.045,
    noiseSeconds: Math.ceil(length / 4.1 + 20),
    barriers: 5 + Math.floor(level / 2) + stage};
}
export function noiseComplete(collected: number) { return collected >= 5; }
export function exitRequirements(resonators: number, required: number, noiseActive: boolean, mandatoryCollected: boolean) {
  return resonators >= required && !noiseActive && mandatoryCollected;
}
