// The camera contract belongs to the board, never to an environment.
// New tables must place their board at this same local anchor. Their dimensions,
// materials and the distant scene framing may change; study framing does not.
export const BOARD_FRAME = {
  center: [0, 0, 0] as const,
  halfExtent: 4.53,
  tallestPiece: 1.82,
  cameraFov: 34,
  viewportMargin: .93,
};

// Art-directed mass estimates for this virtual stone set, not measurements.
// One source drives the animation and the synthesized stone/wood impact.
export const STONE_PIECE_FEEL: Record<string, {estimatedMassGrams:number;durationMs:number;lift:number;resonanceHz:number}> = {
  p:{estimatedMassGrams:45,durationMs:340,lift:.12,resonanceHz:225},
  n:{estimatedMassGrams:75,durationMs:395,lift:.16,resonanceHz:184},
  b:{estimatedMassGrams:65,durationMs:375,lift:.14,resonanceHz:197},
  r:{estimatedMassGrams:85,durationMs:415,lift:.10,resonanceHz:171},
  q:{estimatedMassGrams:105,durationMs:440,lift:.09,resonanceHz:152},
  k:{estimatedMassGrams:115,durationMs:460,lift:.085,resonanceHz:142},
};

export type TableAppearance = {top:string;timber:string;roughness:number};
