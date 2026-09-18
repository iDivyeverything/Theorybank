# Theorybank — room to grow

Essentials are the quiet entry, independent board and rules, local opening source, navigable notation, variations, and replaceable environments. Grow these foundations without adding interface clutter.

Implemented scene foundation: moonlit glass entrance, gradual island reveal, a shared board-center/framing contract, environment-owned table appearance, mineral-textured stone pieces, per-piece weight-tuned motion/contact synthesis, and adjustable moonlight/daylight brightness. A true timed day/night simulation, physics engine, and scrolling island exploration are not included.

## Saved lines and repertoire (next learning feature; not implemented)

- Offer Save a line for the current path, especially a personal continuation after the end of a book sample. A sample's end is not proof that theory ends there.
- Assign `line1`, `line2`, etc. by default using a persistent counter; users may rename lines.
- Store a versioned record with a stable ID, name, initial FEN, ordered moves, optional complete variation tree, opening source/reference, and timestamps. Preserve provenance for book moves and distinguish personal continuations.
- Keep a storage adapter independent of the chess engine and board. Decide explicitly between device-local storage and account-backed sync before building the UI; do not imply cross-device persistence with browser storage.
- Add a Repertoire tab only when list/open/rename/save actually work. Export/import PGN or portable JSON should protect users from lock-in. Deleting or overwriting a saved line should be reversible.

## Structure and piece lessons (later; not implemented)

- Pawn-only study positions, plus a view of the original complete position.
- Typical structures by opening, carefully authored strengths/weaknesses, pawn breaks, space and squares to control or contest. Diagrams must come from verified positions.
- Existing piece-type focus dims nonselected pieces while retaining occupancy and all legal rules. It is a visual filter, not a variant where ghosted pieces disappear.
- Add square highlights and lesson annotations independently of the scene renderer. Piece type selectors should remain distinct from selecting an individual piece to move.

## Opening coverage and depth

- Expand the pinned local catalog through a deterministic importer and position index.
- Deduplicate transpositions by position, while preserving different move orders.
- Selectable depth should name its unit: a ply is one player's move.
- Keep a catalog of named openings distinct from an exhaustive opening book, game-frequency explorer, and engine analysis. Do not invent book moves or claim all theoretical continuations are included.
- Update source snapshots manually with provenance/checksums and review diffs. No automatic upstream dependency is needed.

## Environments

- Retain scene registry and generic board lighting/framing inputs.
- Future choices: other continents, Roman landscapes, floating cities, heavenly scenes, rivers/lakes.
- Keep events sparse and thematic; respect pause, hidden tabs, reduced motion and small-device performance. Add an iguana only with a convincing lightweight animation asset.
- Real live feeds or full video loops are separate capabilities with bandwidth/licensing considerations. The present scene is continuous local animation.

## GitHub transfer

Target: `iDivyeverything/Theorybank`. Requires a verified GitHub connection with repository write access. Before the first transfer, inspect the target repository and its instructions. Preserve existing work. Use a new branch or merge intentionally; never force-push over the user's history. Record completed transfer only after a successful push.
