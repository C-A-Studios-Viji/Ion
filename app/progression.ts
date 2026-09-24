export type BadgeEvent =
  | "room" | "crystal" | "encounter" | "escape" | "kill" | "death" | "craft"
  | "infuse" | "synthesize" | "specimen" | "resonator" | "chase" | "pers_trade"
  | "pers_item" | "basdino" | "banish" | "multiplayer" | "revive" | "save" | "paradox";

export type BadgeRarity = "standard" | "rare" | "ultra" | "xtraultra";
export type Badge = { id: string; title: string; description: string; tutorial?: string; event: BadgeEvent; target: number; detail?: string; rarity?: BadgeRarity };
const milestones = [2, 5, 10, 20, 25, 50, 75, 100, 150, 200];
const entities = ["entity", "blob", "haidini", "crawler", "watcher", "sound", "prism", "mimic", "wraith", "noise", "remetons"];
const minerals = ["malachite", "amethyst", "quartz", "obsidian", "citrine", "fluorite", "corrupted"];
const wares = ["soul", "royalBattery", "obsidianMagazine", "citrineRush", "persKey", "crystalWard"];

export const BADGES: Badge[] = [
  ...milestones.map(room => ({id:`room-${room}`,title:`Room ${room}`,description:`Reach Room ${room}.`,event:"room" as const,target:room})),
  ...entities.map(entity => ({id:`meet-${entity}`,title:`First ${entity.toUpperCase()}`,description:`Encounter ${entity}.`,event:"encounter" as const,target:1,detail:entity})),
  ...entities.map(entity => ({id:`survive-${entity}`,title:`Survive ${entity.toUpperCase()}`,description:`Escape a room containing ${entity}.`,event:"escape" as const,target:1,detail:entity})),
  ...minerals.map(mineral => ({id:`find-${mineral}`,title:`${mineral.toUpperCase()} specimen`,description:`Collect ${mineral}.`,event:"crystal" as const,target:1,detail:mineral})),
  ...[1, 5, 10, 25, 50].map(target => ({id:`collect-${target}`,title:`Mineral collector ${target}`,description:`Collect ${target} minerals across runs.`,event:"crystal" as const,target})),
  ...[1, 5, 10, 25, 50].map(target => ({id:`craft-${target}`,title:`Field crafter ${target}`,description:`Craft ${target} supplies.`,event:"craft" as const,target})),
  ...[1, 3, 7, 15, 30].map(target => ({id:`infuse-${target}`,title:`Infusion expert ${target}`,description:`Apply ${target} infusions.`,event:"infuse" as const,target})),
  ...[1, 2, 5, 10, 25, 50].map(target => ({id:`forge-${target}`,title:`Fluorite foundry ${target}`,description:`Forge ${target} batches of two Fluorite.`,event:"synthesize" as const,target})),
  ...[1, 5, 10, 25, 50].map(target => ({id:`pers-${target}`,title:`Pers patron ${target}`,description:`Trade with Pers ${target} times.`,event:"pers_trade" as const,target})),
  ...wares.map(ware => ({id:`pers-${ware}`,title:`Pers: ${ware}`,description:`Receive ${ware} from Pers.`,event:"pers_item" as const,target:1,detail:ware})),
  ...[1, 3, 5, 10].map(target => ({id:`bond-${target}`,title:`Basdino bond ${target}`,description:`Bond ${target} Basdinos.`,event:"basdino" as const,target})),
  ...[1, 5, 10, 25].map(target => ({id:`specimens-${target}`,title:`Noise samples ${target}`,description:`Collect ${target} Noise specimens.`,event:"specimen" as const,target})),
  ...[1, 4, 10, 30].map(target => ({id:`resonators-${target}`,title:`Resonance ${target}`,description:`Tune ${target} resonators.`,event:"resonator" as const,target})),
  ...[1, 3, 5, 10].map(target => ({id:`chases-${target}`,title:`Blob survivor ${target}`,description:`Finish ${target} five-room chases.`,event:"chase" as const,target})),
  ...[1, 5].map(target => ({id:`banish-${target}`,title:`Exorcist ${target}`,description:`Banish ${target} entities.`,event:"banish" as const,target})),
  ...[1, 3].map(target => ({id:`party-${target}`,title:`Partners ${target}`,description:`Join or host ${target} multiplayer sessions.`,event:"multiplayer" as const,target})),
  {id:"friend-saved",title:"For a Friend",description:"Revive a teammate in multiplayer.",event:"revive",target:1},
  {id:"saved-run",title:"Safe Return",description:"Save a run to a slot.",event:"save",target:1},
  {id:"paradox-echo",title:"The Other Side",description:"Shoot Pers and fall through the tear into Paradox.",tutorial:"Shoot Noble Pers, approach the tear that appears, then press E to fall through.",event:"paradox",target:1,detail:"entered",rarity:"ultra"},
  {id:"gold-ascent",title:"Gold Beyond Stone",description:"Find a Gold Bar on a prime-numbered door and enter Ascended.",tutorial:"Every prime-numbered door has a 14% Gold Bar roll. Collect one to begin the 20-door Ascended route.",event:"paradox",target:1,detail:"ascended",rarity:"ultra"},
  {id:"ascendidox",title:"Ascendidox",description:"Find a Gold Bar while trapped inside Paradox.",event:"paradox",target:1,detail:"ascendidox",rarity:"xtraultra"},
  {id:"paradox-conqueror",title:"Two Hundred Reversed",description:"Beat the 200-door Paradox—or survive its Ascended shortcut.",tutorial:"Reach *200 and escape through its return tear, or find Gold inside Paradox and clear all 20 Ascended doors.",event:"paradox",target:1,detail:"completed",rarity:"xtraultra"},
  {id:"triple-signal",title:"Triple Signal",description:"Host or join with three matching digits in the five-digit code.",tutorial:"Multiplayer codes are random. Connect using any valid code containing one digit at least three times.",event:"multiplayer",target:1,detail:"triple-code",rarity:"xtraultra"},
  {id:"grin-cycle",title:"Grin Around the Corner",description:"Survive the Grin on every twenty-fifth reversed door.",tutorial:"Reach a reversed door divisible by 25 and escape the guaranteed Grin encounter.",event:"escape",target:1,detail:"reversed-grin",rarity:"ultra"},
  {id:"blob-omen",title:"Seven Percent Omen",description:"Survive a random reversed-world Blob breach.",tutorial:"A reversed room has a 7% chance to summon the Blob. Survive the breach.",event:"escape",target:1,detail:"reversed-blob",rarity:"ultra"},
];
// Fill every generated entry with a concise tutorial while keeping special badges explicit.
BADGES.forEach(b => { if (!b.tutorial && b.id!=="ascendidox") b.tutorial = b.description; });
if (BADGES.length !== 100 || new Set(BADGES.map(b => b.id)).size !== 100) throw new Error("Badge catalog must contain 100 unique badges");

export type BadgeProgress = { unlocked: string[]; counts: Partial<Record<BadgeEvent, number>>; detailCounts: Record<string, number> };
export const emptyBadgeProgress = (): BadgeProgress => ({unlocked:[],counts:{},detailCounts:{}});
/** Roll the first crawler, then give each additional crawler a smaller conditional chance. */
export function rollCrawlerPack(rand:()=>number,tier:number):number {
  if(rand()>=.2+tier*.045)return 0;
  let count=1;
  for(const chance of [.42,.24,.12]){if(rand()>=chance)break;count++;}
  return count;
}
export function awardBadges(progress: BadgeProgress, event: BadgeEvent, detail?: string, value = 1): Badge[] {
  progress.counts[event] = Math.max(0,(progress.counts[event] ?? 0) + value);
  if(detail) progress.detailCounts[`${event}:${detail}`] = (progress.detailCounts[`${event}:${detail}`] ?? 0) + value;
  const won = BADGES.filter(b => b.event === event && !progress.unlocked.includes(b.id)
    && (b.detail ? (progress.detailCounts[`${event}:${b.detail}`] ?? 0) : (progress.counts[event] ?? 0)) >= b.target);
  progress.unlocked.push(...won.map(b => b.id));
  return won;
}

export type RunSlot<T> = { savedAt: number; state: T };
export const RUN_STORAGE_KEY = "ion-saves-v1";
export function readRunSlots<T>(storage: Pick<Storage,"getItem">): (RunSlot<T> | null)[] {
  try {
    const data = JSON.parse(storage.getItem(RUN_STORAGE_KEY) ?? "null");
    return Array.from({length:3},(_,i)=>{
      const entry=data?.[i];
      return Number.isFinite(entry?.savedAt) && Number.isInteger(entry?.state?.room) && entry.state.room>=1 && entry.state.room<=200 ? entry : null;
    });
  } catch { return [null,null,null]; }
}
export function writeRunSlot<T>(storage: Pick<Storage,"getItem"|"setItem">, slot: number, state: T, savedAt = Date.now()) {
  if (!Number.isInteger(slot) || slot < 0 || slot > 2) throw new RangeError("Invalid run slot");
  const slots = readRunSlots<T>(storage); slots[slot] = {savedAt,state};
  storage.setItem(RUN_STORAGE_KEY,JSON.stringify(slots));
  return slots;
}
