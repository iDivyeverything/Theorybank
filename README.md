# Theorybank

A quiet chess study space: an open tropical shore, a weathered timber table matching the wooden canoe, and an independent 3D board with smooth mineral-textured stone pieces. The entrance is almost black, with a moonlit Liquid Glass **Study** panel. Study reveals the island, then moves the camera toward the fixed table over 3.4 seconds. Returning to the beach retains the revealed scene.

## Using the first version

1. Choose **Study** to reveal the island and approach the table. The entrance sound button can start wind and waves before the reveal; browsers require a first gesture. Study starts sound unless the visitor has already made a sound choice.
2. Select a board square to see starter lines containing moves from or to that square, or browse all 22 starters. Empty squares without a matching sample explain that no starter is available yet. Free exploration opens a fresh position.
3. Choose a line to load its final arrangement. Click either color's pieces on their legal turns. Promotion offers all four choices.
4. Click any algebraic move to restore that exact position, or step through the line. A different move preserves the old continuation as a branch.
5. Use the piece filter to dim all other piece types, or flip/orbit the board and switch overhead. Sound is optional. Scene settings include a continuous moonlight-to-daylight slider; its device-local preference persists. Night remains usable and is brighter than the initial entrance. This is an adjustable lighting control, not a timed astronomical day/night simulation.
6. Scene pause also pauses occasional events; events cannot start before the reveal. Reduced motion skips the reveal delay, camera and piece movement, and scenery events.

Study trees are **session-only** in this version. Saved repertoires and structured lessons are deliberately deferred; there is no misleading Save button or account system.

## Independent opening data

`data/openings/lichess/` contains a fixed CC0 catalog snapshot: 3,810 named entries across a.tsv–e.tsv, its license, upstream README and provenance/checksums in SNAPSHOT.json. The upstream commit is pinned. This is the complete named-opening catalog at that revision, **not every theoretical chess line or the Lichess games database**.

The UI imports only `data/openings/starter-lines.json`, a 22-line sample. `node scripts/prepare-opening-sample.mjs` rebuilds that sample entirely offline and validates every move with chess.js. No live request, redirect, embed, API key, subscription, engine or Lichess service is required to use the board. Upstream changes do not change Theorybank unless its owner deliberately replaces the checked-in snapshot and rebuilds. Future indexing can add more catalog entries without modifying the board.

## Architecture

- `lib/chess/study.ts`: headless legal rules and immutable branching study trees. Replaying SAN preserves repetition history. Nodes store FEN, move notation, origin/destination, parent/children and depth in plies.
- `lib/chess/openings.ts`: square-to-line lookup and local implementation of the `OpeningBookProvider` interface. `depthLimitPlies` is measured from the initial position. Opening names, theoretical claims, frequency and engine scores remain separate concepts.
- `components/chess/ChessBoard.tsx`: reusable input and accessibility boundary. Position, highlights, piece focus, camera framing and lighting arrive as props; the component owns no game rules or opening data.
- `components/chess/board-renderer.ts`: Three.js board, physical piece materials, camera transitions and legal-move highlights. The canvas fills a fixed viewport; camera position, look target and framing change together while the table and board remain at the world origin. A software 3D renderer and simple-board fallback cover missing GPU support.
- `components/chess/coastal-table.ts`: separate weathered planks, trestles, splayed feet, timber pegs and contact shadow. Its materials share the canoe's warm wood palette.
- `lib/chess/presentation.ts`: shared board center, camera framing bounds and per-piece feel. Every environment's table sits below this same board anchor; the study camera fits the board and tallest pieces, not the table. Piece mass values are art-directed estimates, not measured weights or a physical simulation. They drive a slower, lower lift and deeper landing for larger pieces, with modest timing/pitch variation. Software fallback moves pieces immediately to keep interaction responsive.
- `lib/environments/registry.ts`: scene definitions, lighting and lightweight event scheduling. Add future landscapes/fantasy scenes here without rebuilding chess.
- `components/environments/scene-backdrop.ts`: lightweight photographed scenery projected onto a stationary sand floor and distant plane. The camera produces foreground parallax. This is a photo-backed scene, not a fully modeled island or live video. Water and foliage use subtle local shader animation. The same renderer draws the board, scenery and event.
- `components/environments/Environment.tsx`: scenery fallback for browsers without WebGL; a matching image approach accompanies the software-rendered camera. The fallback has less spatial detail than the WebGL scene.
- `components/environments/AmbientEvent.tsx`: software version of the small wooden boat event. Both renderers share the registry schedule: after 55 seconds of active scene time, a 65-second drift on a four-minute cycle. Hidden tabs and paused scenes stop its clock. The boat never takes pointer input.
- `components/environments/useSurfAudio.ts`: locally synthesized surf, wind, and layered stone-on-wood impacts. Contact sound is triggered by the renderer when a played move lands, not by clicking notation or filtering pieces. A single mute control governs all sounds. Hidden tabs are muted. No remote sound assets or paid audio services are used.
- `app/page.tsx`: composition and ambient → choose → study state transitions. Existing studies survive switching lines during the visit. Page-scoped WebMCP tools use the same legal move and navigation operations as the UI.

## Future work

See `ROADMAP.md` for saved-line/repertoire and pawn-structure lesson requirements. Keep those additions behind independent data/storage interfaces. The existing piece filter is the visual foundation for those lessons.

## Development and portability

React, Three.js and chess.js, using the Sites Vinext starter. Node 22.13+ and the declared pnpm version are required. Preserve `pnpm-lock.yaml`. Use `pnpm dev` and `pnpm build`; managed Sites environments use their supervised preview and build helpers. Shell entry points explicitly invoke Bash so a GitHub web upload or ZIP checkout need not preserve executable bits. No database or paid chess API is required.

The website is currently maintained and published with ChatGPT Sites. `.openai/hosting.json` contains its Site identity, not credentials. GitHub is a separate source-control destination. The intended user repository is `iDivyeverything/Theorybank`; publishing with Sites does not itself upload anything to GitHub. A GitHub transfer must preserve any existing repository content and history, preferably through a new branch for review. No credentials should ever be committed.

The chess, environment and data modules are browser-side and portable. A move to GitHub Pages would need a static-export build and repository base-path handling; this is not configured yet. Uploading the source to GitHub and hosting on GitHub Pages are separate actions.

## Assets and licenses

Beach and boats: original generated artwork, served locally. Board/pieces/table: local Three.js geometry. Opening catalog: CC0, with upstream license and provenance retained. Icons: Lucide. Chess rules: chess.js. Other dependency licenses remain their respective owners'.
