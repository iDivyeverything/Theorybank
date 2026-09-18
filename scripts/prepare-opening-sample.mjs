// Rebuild the small UI sample from our checked-in, pinned catalog. No network.
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
const names = [
  'Italian Game', 'Ruy Lopez', 'Scotch Game', 'Sicilian Defense',
  'Sicilian Defense: Najdorf Variation', 'Sicilian Defense: Dragon Variation',
  'Sicilian Defense: Accelerated Dragon', 'Sicilian Defense: Taimanov Variation',
  'Sicilian Defense: Scheveningen Variation', 'French Defense', 'Caro-Kann Defense',
  'Scandinavian Defense', "Queen's Gambit Declined", 'Slav Defense',
  "Queen's Pawn Game: London System", "King's Indian Defense", 'Nimzo-Indian Defense',
  'English Opening', 'Réti Opening', 'Nimzo-Larsen Attack', 'Bird Opening', 'Polish Opening',
];
const rows = 'abcde'.split('').flatMap(letter => readFileSync(`data/openings/lichess/${letter}.tsv`, 'utf8')
  .trim().split('\n').slice(1).map(line => { const [eco,name,pgn] = line.split('\t'); return {eco,name,pgn}; }));
const lines = names.map((name, index) => {
  const row = rows.find(row => row.name === name);
  if (!row) throw new Error(`Missing opening: ${name}`);
  const chess = new Chess(); chess.loadPgn(row.pgn);
  const history = chess.history({verbose:true});
  return { id:`opening-${index+1}`, ...row, moves:history.map(m=>m.san),
    squares:[...new Set(history.flatMap(m=>[m.from,m.to]))],
    uci:history.map(m=>m.from+m.to+(m.promotion||'')), fen:chess.fen() };
});
writeFileSync('data/openings/starter-lines.json', JSON.stringify({schemaVersion:1, source:'bundled-lichess-cc0', lines},null,2)+'\n');
console.log(`Prepared ${lines.length} validated starter lines from ${rows.length} catalog entries.`);
