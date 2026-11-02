# ION

A first-person 3D survival-horror game set inside an abandoned underground
crystal research facility.

## Play on GitHub Pages

This repository includes a dedicated static browser build and GitHub Actions
workflow. After GitHub Pages is set to **GitHub Actions** in the repository
settings, each push to `main` builds and publishes the game automatically.

The Pages build uses relative asset URLs, so it works from the `/Ion/`
repository path as well as a custom domain.

## Runs, badges and two-player co-op

Open **Saved runs** from the main menu to start or resume one of three local
save slots. Each room entry is saved automatically; the pause menu also offers
a manual save for crystals, inventory, tuned resonators and collected specimens.
Saves and the 250 badge records remain in that browser's storage. Clearing site
data removes them, and they do not follow an account to another device.

Open **Play with a friend**, confirm your Boons, then share the generated invite
link. Your friend opens the link and chooses **Join**. Both players enter the
host's current room. The host keeps the game open and owns room/hazard state.

Multiplayer uses the ION Supabase Realtime server over secure WebSockets. It has
no PeerJS, WebRTC, STUN or TURN dependency and does not need a player plugin.
Reliable actions and snapshots have acknowledgement, retry, ordered delivery and
duplicate suppression. Movement updates skip stale packets. Brief network
interruptions reconnect to the same invite and request a fresh host snapshot.
Only one guest is admitted; a third survivor receives a room-full message.
Invite links are room capabilities: share them only with the intended friend.
A new hosting session creates a new link. This is host-authoritative co-op via a
managed relay, rather than a separately simulated dedicated game server.

The relay project is `ion-multiplayer` in Mumbai (`ap-south-1`), initially created
on Supabase's free plan. Only its public publishable key is in the browser;
there are no player accounts or publicly readable game database tables. Free
plan connection and message quotas apply. Configure the endpoint in
`app/multiplayerConfig.ts` if the project is moved or the public key is rotated.

The cave envelope uses baked geometry and byte textures with stock materials.
The bedrock rises into rounded wall fillets and a rough ceiling crown. Surface
detail is cosmetic; traversal continues to use the original smooth collision
profile. Required-object clearances and the exit aperture remain open.

Run all 150 deterministic gameplay, geometry, asset and multiplayer checks:

```bash
node --test tests/encounters.test.cjs tests/multiplayer.test.cjs tests/assets.test.mjs
npx tsc --noEmit --incremental false
npm run build:pages
```

The network tests exercise loss/retry, reordered snapshots, reconnects, occupied
rooms, room isolation, malformed packets, dimension door numbers and co-op
actions. They use a simulated relay for reproducibility; actual server and
browser acceptance checks must be run separately.

The Infusionsmith converts Malachite, Amethyst, Quartz and Corrupted crystal
into two Fluorite per batch. Normal rooms can contain one through four Crawlers,
with each additional Crawler less likely than the previous one.

## 3D model assets

The neon pursuit update adds rounded props, gradient shading, blue skylight
shafts, redesigned smooth monsters and per-entity 3D jumpscares with CC0 horror
audio. Noise requires five cyan specimen capsules before its timer expires.
Scheduled Blob chases occupy rooms 25–29, 50–54, …, 175–179, with four resonators
and five specimens in every room. Resonators briefly stagger the pursuer.
Remetons has a 2% roll in eligible normal rooms and transforms Pers into an
infected Blob before a separate five-room chase. Its starts exclude the first
five rooms and runs that would overlap a scheduled chase, Pers Hub or extraction.

Run the renderer-independent encounter checks with
`node --test tests/encounters.test.cjs`. They exercise the actual game closures
for objective placement, Noise death/collection, key restrictions and infection
timing, as well as chase boundaries and creature geometry.

ION bundles 19 CC0 models from Kenney and Quaternius for equipment, minerals,
facility props and animated creatures. See [ASSET_CREDITS.md](ASSET_CREDITS.md)
for the original sources, licenses and in-game mappings. Custom named monsters
retain their ION designs. Model loading and independent animation rigs live in
`app/modelAssets.ts`; textures are embedded in the GLB files.

## Local development

```bash
npm install
npm run dev
```

To test the same static build used by GitHub Pages:

```bash
npm run build:pages
npx vite preview --outDir dist-pages
```

## Original Sites project notes

A clean full-stack starter running on
[vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and
Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`
- Linux with `flock`, `curl`, and GNU `timeout`

## Sites Lifecycle

The Sites lifecycle CLI runs the locked dependency install before returning this checkout. Edit the source under `app/`, then checkpoint when a coherent milestone is ready to inspect or share. The remote Sites builder runs `npm run build` against the pushed commit. Do not repeat install or build as a normal pre-checkpoint step.

This starter does not use `wrangler.jsonc`.

`install:ci` is intentionally a single, non-retrying `npm ci`. It refuses a concurrent install for the same project, consumes a matching image-seeded npm cache with `--prefer-offline` while retaining registry fallback for a missing cache object, otherwise downloads and verifies the complete vinext tarball recorded in `package-lock.json`, limits npm to one socket, and terminates a stalled install. `build` applies a short timeout and then validates the Sites artifact. These helpers target Linux and use GNU `timeout`; they are not native macOS scripts.

Scripts that need writable project-scoped home, npm, XDG, and temporary paths use `scripts/sites-env.sh`. The `dev` and `start` scripts honor the caller's runtime environment and keep Wrangler logs inside the checkout. The generated `.sites-runtime/` directory is disposable and ignored by Git.

## Included Shape

- edit site code under `app/`
- `app/chatgpt-auth.ts` provides optional dispatch-owned ChatGPT sign-in helpers
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/index.ts` reads the D1 binding from the Cloudflare Worker environment
- `db/schema.ts` starts intentionally empty
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

OpenAI workspace sites can read the current user's email from
`oai-authenticated-user-email`.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Diagnostic Commands

- `npm run install:ci`: perform the one bounded lockfile install
- `npm run dev`: start the Vite/Vinext development server
- `npm run build`: build and validate the deployable Sites artifact
- `npm run start`: start the built Vinext application
- `npm test`: build, validate, and verify the rendered development-preview metadata
- `npm run validate:artifact`: recheck an existing artifact's manifest and ESM `default.fetch` export
- `npm run db:generate`: generate Drizzle migrations after schema changes

Use build and validation commands for targeted diagnosis after a remote failure, not as part of the normal checkpoint path.

The timeout defaults can be overridden for a controlled canary with `SITES_INSTALL_TIMEOUT`, `SITES_INSTALL_KILL_AFTER`, `SITES_BUILD_TIMEOUT`, and `SITES_BUILD_KILL_AFTER`. A timeout fails the command; the helpers never retry an unchanged install or build.

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)

## Variable rooms

Ordinary doors can lead to Grand Chambers, Duplexes, Multi-floor Facilities, Basements, Crystal Mazes, Collapsed Rooms, Flooded Chambers, Observation Rooms or INVERSION. Ramps connect elevated floors, maze gaps have glowing route markers, and flooded areas slow movement outside walkways. Special chase, Hub and dimension rooms retain their dedicated courses.

INVERSION swaps W/S and A/D (including touch movement). Purple light warns of Pers’s strike: hide behind a cabinet or in a trapdoor. Break three crystal anchors to release the exit, then escape his pursuit to qualify for the Ultra badge “Wrong Way Home.” Existing daily badge permission still applies.

The archive contains exactly 250 badges, with 100 tutorials hidden. Retired Boon trials are preserved in browser save history; retained badges and counters carry forward.

## Visual style and crystal assets

ION uses its original green terminal menus, HUD, neon mineral gradients,
dark facility materials, lighting and fog. The seven distinct CC0 STL crystal
meshes remain bundled with procedural fallbacks. See ASSET_CREDITS.md and
app/assets/minerals/SOURCE.md for the exact asset origins.

Cave rooms add dense cosmetic gravel, broken slabs and uneven ground detail. These meshes never enter movement colliders, so walking and jumping use the established smooth floor. Pickups, stations, entrances and exits have clear space around them.
