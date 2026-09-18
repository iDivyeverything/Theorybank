import { Chess, DEFAULT_POSITION, type Square } from "chess.js";

export type MoveInput = string | { from: Square; to: Square; promotion?: string };
export type StudyNode = {
  id: string; parentId: string | null; children: string[];
  fen: string; san: string; uci: string; ply: number;
  from?: Square; to?: Square;
};
export type Study = {
  rootFen: string; currentId: string; nextId: number;
  nodes: Record<string, StudyNode>; preferredChild: Record<string, string>;
};

export function createStudy(rootFen = DEFAULT_POSITION): Study {
  const game = new Chess(rootFen);
  return { rootFen, currentId: "root", nextId: 1, preferredChild: {}, nodes: {
    root: { id: "root", parentId: null, children: [], fen: game.fen(), san: "", uci: "", ply: 0 },
  } };
}

export function pathTo(study: Study, id = study.currentId): StudyNode[] {
  const path: StudyNode[] = [];
  let node = study.nodes[id];
  while (node?.parentId) { path.push(node); node = study.nodes[node.parentId]; }
  return path.reverse();
}

// Replaying the path preserves repetition history, unlike loading only its FEN.
export function gameAt(study: Study): Chess {
  const game = new Chess(study.rootFen);
  for (const node of pathTo(study)) game.move(node.san);
  return game;
}

export function navigateTo(study: Study, id: string): Study {
  if (!study.nodes[id]) throw new Error("That position is not in this study.");
  const preferredChild = { ...study.preferredChild };
  for (const node of pathTo(study, id)) preferredChild[node.parentId!] = node.id;
  return { ...study, currentId: id, preferredChild };
}

export function playMove(study: Study, input: MoveInput): Study {
  const game = gameAt(study);
  const move = game.move(input);
  const parent = study.nodes[study.currentId];
  const uci = move.from + move.to + (move.promotion || "");
  const existing = parent.children.find(id => study.nodes[id].uci === uci);
  if (existing) return navigateTo(study, existing);
  const id = `n${study.nextId}`;
  const node: StudyNode = { id, parentId: parent.id, children: [], fen: game.fen(),
    san: move.san, uci, ply: parent.ply + 1, from: move.from, to: move.to };
  return { ...study, currentId: id, nextId: study.nextId + 1,
    preferredChild: { ...study.preferredChild, [parent.id]: id },
    nodes: { ...study.nodes, [parent.id]: { ...parent, children: [...parent.children, id] }, [id]: node } };
}

export function activeLine(study: Study): StudyNode[] {
  const line: StudyNode[] = [];
  let node = study.nodes.root;
  while (node.children.length) {
    node = study.nodes[study.preferredChild[node.id] || node.children[0]];
    line.push(node);
  }
  return line;
}

export function seedStudy(moves: string[]): Study {
  let study = createStudy();
  for (const move of moves) study = playMove(study, move);
  return navigateTo(study, "root");
}

export function positionKey(fen: string): string { return fen.split(" ").slice(0, 4).join(" "); }

// A data provider can be attached without touching the board or the environment.
// A ply is one player's move. The future depth control will use this unit.
export interface OpeningBookProvider {
  id: string;
  lookup(input: { fen: string; moves: string[]; depthLimitPlies?: number; signal?: AbortSignal }): Promise<{
    name?: string; eco?: string; source: string;
    continuations: { uci: string; san: string; name?: string; games?: number }[];
  }>;
}

export const EXAMPLES = [
  { id: "free", name: "Free exploration", detail: "A fresh board. Room to think.", moves: [] },
  { id: "italian", name: "Italian Game", detail: "An open center. A natural development.", moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"] },
  { id: "sicilian", name: "Sicilian Defense", detail: "Two different ways to claim the center.", moves: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6"] },
  { id: "queens", name: "Queen’s Gambit", detail: "A little space on the queenside.", moves: ["d4", "d5", "c4", "e6", "Nc3", "Nf6", "Bg5", "Be7"] },
];
