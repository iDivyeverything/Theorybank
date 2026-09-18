import sample from '@/data/openings/starter-lines.json';
import { Chess } from 'chess.js';
import { positionKey, type OpeningBookProvider } from './study';

export const STARTER_LINES = sample.lines;
export type OpeningLine = (typeof STARTER_LINES)[number];

// A square matches a piece's origin or destination in a named starting line.
// This is an opening picker, separate from legal-move selection during study.
export function openingsForSquare(square: string): OpeningLine[] {
  return STARTER_LINES.filter(line => line.squares.includes(square));
}

// Bundled records only. This provider never calls Lichess or any external API.
export const localOpeningBook: OpeningBookProvider = {
  id: 'theorybank-local-v1',
  async lookup({fen, depthLimitPlies, signal}) {
    signal?.throwIfAborted();
    const continuations = new Map<string,{uci:string;san:string;name:string}>();
    let name: string | undefined, eco: string | undefined;
    for (const line of STARTER_LINES) {
      const game = new Chess();
      for (let ply=0; ply<=line.moves.length; ply++) {
        if (positionKey(game.fen()) === positionKey(fen)) {
          if (ply===line.moves.length) { name=line.name; eco=line.eco; }
          if (ply<line.moves.length && (depthLimitPlies===undefined || ply<depthLimitPlies)) {
            const move = game.move(line.moves[ply]);
            const uci=move.from+move.to+(move.promotion||'');
            continuations.set(uci,{uci,san:move.san,name:line.name});
          }
          break;
        }
        if (ply<line.moves.length) game.move(line.moves[ply]);
      }
    }
    return {name,eco,source:sample.source,continuations:[...continuations.values()]};
  },
};
