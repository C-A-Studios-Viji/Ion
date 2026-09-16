# ION 3D assets

## Neon pursuit update

All hostile silhouettes now come from `app/monsterModels.ts`: custom smooth 3D
surfaces, curved limbs, distinct eyes/mouths and animated details for Grin, Blob,
Haid-Ini, Crawler, Watcher, Sound Hunter, Prism, Mimic, Wraith, Noise and Remetons.
The older Alien and Ghost_Skull files remain in the source archive but are no
longer downloaded by the game. The animated Quaternius Basdino remains in use.

`app/surfaceStyle.ts` rounds static imported props with one subdivision and gentle
relaxation, smooths normals without changing skinning weights, and supplies
blue/cyan/purple gradient materials. Crystal tips keep their mineral silhouettes.

### Online jumpscare audio

[Monster Sound Effects 2 by Ogrebane](https://opengameart.org/content/monster-sound-effects-2)
is licensed **CC0 1.0**, as stated on its original download page. Source archive:
https://opengameart.org/sites/default/files/monster_sfx_pack_2.zip

Original `monster-1.wav` through `monster-11.wav` are bundled as
`app/assets/audio/monster-1.ogg` through `monster-11.ogg`. They map respectively
to Grin, Blob, Haid-Ini, Crawler, Watcher, Sound Hunter, Prism, Mimic, Wraith,
Noise and Remetons. Processing: maximum 2.5 seconds, mono 32 kHz, Vorbis,
normalized to -22 LUFS with -6 dBTP ceiling. Playback adds per-creature pitch
and filtering through the game's master compressor.

The online recordings accompany ION's own animated 3D jumpscares; no third-party
game footage or unlicensed jumpscare videos are included.

These models are bundled with the game. No model downloads, accounts, or third-party requests are needed while playing. All source packs below are **CC0 1.0 (public domain)**. Original license notices are preserved in `app/assets/licenses/`.

| Author / source pack | Source model | Bundled file / use |
| --- | --- | --- |
| [Kenney — Space Kit](https://kenney.nl/assets/space-kit) | rock_crystalsLargeA, rock_crystals | crystals, crystal-small: formations and collectible minerals |
| Kenney — Space Kit | rock_largeA, rock_largeB | rock, rock-wide: cave walls |
| Kenney — Space Kit | machine_generator, barrel | generator: room machinery; barrel: battery cell |
| [Kenney — Blaster Kit](https://kenney.nl/assets/blaster-kit) | blaster-e, clip-large | rifle, magazine: player equipment and ammunition |
| [Kenney — Space Station Kit](https://kenney.nl/assets/space-station-kit) | door-single-closed, floor-panel | door, hatch: lifting pressure gates and trapdoors |
| Kenney — Space Station Kit | computer, table-display | computer, infuser: archive, resonators and Infusionsmith |
| Kenney — Space Station Kit | container, bed-single, wall-detail | crate, lab-bed, wall-panel: storage, laboratory and corridor props |
| [Kenney — Survival Kit](https://kenney.nl/assets/survival-kit) | workbench | workbench: Crystal Crafter |
| [Quaternius — Ultimate Monsters](https://quaternius.com/packs/ultimatemonsters.html) | Big/Alien | alien: animated sound hunter and crouched Crawler |
| Quaternius — Ultimate Monsters | Big/Dino | basdino: animated companion |
| Quaternius — Ultimate Monsters | Flying/Ghost_Skull | watcher: animated Watcher |

Retrieved September 16, 2026 from the authors' official download links. Quaternius's shared download folder includes a CC0 notice whose heading says “Ultimate Platformer Pack”; it is preserved verbatim, and the Ultimate Monsters product page independently identifies the pack as CC0.

Packaging changes: renamed files, embedded external textures, converted self-contained glTF JSON to GLB containers. Original meshes, texture pixels and animation clips are retained. Runtime changes: scaling, grounding, material recoloring, mineral emission, and selection of movement clips. Creature clones have independent skeletons and animation mixers.

The custom Grin, Blob, Haid-Ini and Noble Pers remain ION's procedural designs; they have not been replaced with unrelated stock characters. Synthesized Fluorite retains its cubic shape. Blood decals, lights, whirlpool effects, collision geometry and parkour courses remain procedural.

Models are approximately 2.3 MiB total before HTTP compression. `app/modelAssets.ts` owns loading, normalization, cloning and disposal. Start waits for loading to settle, and individual failed downloads use the existing procedural fallback.
