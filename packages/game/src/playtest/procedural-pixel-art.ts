import type * as Phaser from 'phaser';

export interface PixelArtSpriteSpec {
  readonly key: string;
  readonly width: number;
  readonly height: number;
  readonly palette: Readonly<Record<string, string>>;
  readonly rows: readonly string[];
}

export const PLAYTEST_PIXEL_TEXTURE_KEYS = {
  ironGolem: 'mfd-px-iron-golem',
  zombie: 'mfd-px-zombie',
  grassEven: 'mfd-px-grass-even',
  grassOdd: 'mfd-px-grass-odd',
  energy: 'mfd-px-energy',
  crystal: 'mfd-px-crystal',
} as const;

export const PIXEL_ART_SPRITES: readonly PixelArtSpriteSpec[] = [
  {
    key: PLAYTEST_PIXEL_TEXTURE_KEYS.ironGolem,
    width: 32,
    height: 32,
    palette: {
      O: '#1E293B',
      L: '#F1F5F9',
      M: '#CBD5E1',
      S: '#94A3B8',
      D: '#475569',
      E: '#EF4444',
      G: '#F97316',
      V: '#4ADE80',
      W: '#15803D',
    },
    rows: [
      '................................',
      '..........OOOOOOOOOOO...........',
      '..........OLLLLLLLLMO...........',
      '..........OLMMMMMMMMO...........',
      '..........OLMSSOOOOOO...........',
      '..........OLMOEOMMOEO...........',
      '..........OLMMGGMMGGO...........',
      '..........OMMMMMSSSMO...........',
      '......OOOOOOOOOOOOOOOOOOOO......',
      '.....OLLLLLLVVLLLMMMMMMMMMO.....',
      '....OLMMMMMVWVLMMMMMMMMMSSMO....',
      '....OLMMMOSVWWVMMMMMMSOMSSMO....',
      '....OLMMOOMMVWVMMMMMMOOMSSMO....',
      '....OLMMOOMMMVWVMMMMMOOMSSMO....',
      '....OMSMOOMMMMVWVVMMMOOMSSMO....',
      '....OMSMOOMMMMMSSSMMMOOMSSMO....',
      '....OMSMOODDDDDDDDDDDOOMDSMO....',
      '....OMSMO.OSSSSSSSSSO.OMDSMO....',
      '....OMSMO.OSSSSDDSSSO.OMDSMO....',
      '....ODSMO.OSSSSSSSSSO.ODDSMO....',
      '....ODSMO.OOOOOOOOOOO.ODDSMO....',
      '....ODSMO..OMMMOMMMO..ODDSMO....',
      '....ODDMO..OMSMOMSMO..ODDDMO....',
      '....OOOO...OMSMOMSMO...OOOO.....',
      '...........OMSMOMSMO............',
      '...........OMSMOMSMO............',
      '...........ODSDODSDD............',
      '...........ODSDODSDD............',
      '..........OODDOOODDOO...........',
      '..........ODDDDOODDDDO..........',
      '..........OOOOOOOOOOOO..........',
      '................................',
    ],
  },
  {
    key: PLAYTEST_PIXEL_TEXTURE_KEYS.zombie,
    width: 32,
    height: 32,
    palette: {
      O: '#0F172A',
      H: '#86EFAC',
      G: '#4D7C0F',
      F: '#65A30D',
      D: '#365314',
      E: '#1E293B',
      C: '#22D3EE',
      T: '#0891B2',
      B: '#0E7490',
      P: '#3B4278',
      N: '#1E1B4B',
      S: '#334155',
    },
    rows: [
      '................................',
      '................................',
      '..........OOOOOOOOOO............',
      '.........OHHHHHFFFFFO...........',
      '.........OFFFFFFFFFFO...........',
      '.........OFOOFFFFOOFO...........',
      '.........OFOEFFFOOEFO...........',
      '.........OFFFFDDFFFFO...........',
      '.........OFDDDDDDDFFO...........',
      '.........OOGGGGGGGGGO...........',
      '.....OOOOOOOOOOOOOOOOOO.........',
      '....OFFFFFFFCCCCCCCCCCCO........',
      '...OFFFFFFFOCCCCCCCCCTTBO.......',
      '...OGGGGGGGOTTTTTTTTTTTBO.......',
      '....OOOOOOOOCTTTTTTTTTBBO.......',
      '..OFFFFFFFO.OTTTTTTTTBBBO.......',
      '..OGGGGGGO..OTTTTTTBBBBBO.......',
      '...OOOOOO...OTTTTTTBBBBBO.......',
      '............OOOOOOOOOOOOO.......',
      '............OPPPPPPPPPNNO.......',
      '............OPPPPNNPPPNNO.......',
      '............OPPPNOONPPNNO.......',
      '............OPPPNO.OPPNNO.......',
      '............OPPPNO.OPPNNO.......',
      '............ONPPNO.ONPNNO.......',
      '............ONNNNO.ONNNNO.......',
      '............ONNNNO.ONNNNO.......',
      '...........OSSSSSO.OSSSSO.......',
      '...........OSSSSO..OSSSSO.......',
      '...........OOOOOO..OOOOOO.......',
      '................................',
      '................................',
    ],
  },
  {
    key: PLAYTEST_PIXEL_TEXTURE_KEYS.grassEven,
    width: 32,
    height: 32,
    palette: {
      A: '#1E5631',
      B: '#256D3B',
      C: '#2E8547',
      D: '#4ADE80',
      E: '#166534',
      F: '#FEF08A',
    },
    rows: [
      'BBBBABBBBCBBBBABBBBBBCBBBBABBBBC',
      'BABBBCCBBBABBBCCBBBBABBBCCBBBBAB',
      'BBDCBBBBBBBBDCBBBBBBBBDCBBBBBBBB',
      'BBBCBBBBBBBBBCBBBFBBBBBCBBBBBBBB',
      'ABBBBBABBBBABBBBBABBBBABBBBBABBB',
      'BBBEEBBBBBBBBEEBBBBBBBBEEBBBBBBB',
      'BBBEABBBBBBBBEABBBBBBBBEABBBBBBB',
      'BBBBBBBBCCBBBBBBBBCCBBBBBBBBCCBB',
      'BCBBBBBBDCBBBCBBBBDCBBBCBBBBDCBB',
      'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      'ABBBCCBBBBBBABBBCCBBBBBBABBBCCBB',
      'BBBBDCBBBBBBBBBBDCBBBBBBBBBBDCBB',
      'BBBBBBBBEEBBBBBBBBEEBBBBBBBBEEBB',
      'BBABBBBBEABBBBABBBEABBBBABBBEABB',
      'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      'BBBBFBBBBCCBBBBBBBBCCBBBBBBBBCCB',
      'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      'ABBBCCBBBBABBBCCBBBBABBBCCBBBBAB',
      'BBBBDCBBBBBBBBDCBBBBBBBBDCBBBBBB',
      'BBBBBBBBEEBBBBBBBBEEBBBBBBBBEEBB',
      'BCBBBBBBECBBBCBBBBECBBBCBBBBECBB',
      'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      'BBABBBCCBBBBBBABBBCCBBBBBBABBBCC',
      'BBBBBBDCBBBBBBBBBBDCBBBBBBBBBBDC',
      'BBBBBBBBBBEEBBBBBBBBBBEEBBBBBBBB',
      'BBEEBBBBBBECBBBBEEBBBBECBBBBEEBB',
      'BBEABBBBBBBBBBBBEABBBBBBBBBBEABB',
      'BBBBBBBCBBBBBBBBBBBBBCBBBBBBBBBB',
      'ABBBBBDCBBBBABBBBBBBDCBBBBABBBBB',
      'BBBBBBBBBBBBBBBBFBBBBBBBBBBBBBBB',
      'BBCCBBBBABBBBBCCBBBBABBBBBCCBBBB',
      'ABBBBBBBBCBBBABBBBBBBBCBBBABBBBB',
    ],
  },
  {
    key: PLAYTEST_PIXEL_TEXTURE_KEYS.grassOdd,
    width: 32,
    height: 32,
    palette: {
      A: '#194A2A',
      B: '#205E33',
      C: '#28753F',
      D: '#3BC46C',
      E: '#14532D',
      F: '#BAE6FD',
    },
    rows: [
      'ABBBBCBBBBABBBBCBBBBABBBBCBBBBAB',
      'BBBBBBBBCCBBBBBBBBCCBBBBBBBBCCBB',
      'BBABBBBBDCBBBBABBBDCBBBBABBBDCBB',
      'BBBBEEBBBBBBBBEEBBBBBBBBEEBBBBBB',
      'BBBBEABBBBBBBBEABBBBBBBBEABBBBBB',
      'BBBBBBBBBCBBBBBBBBBCBBBBBBBBBCBB',
      'BCBBBBBBDCBBBCBBBBDCBBBCBBBBDCBB',
      'BBBBBBBBBBBBBBBBFBBBBBBBBBBBBBBB',
      'ABBBCCBBBBBBABBBCCBBBBBBABBBCCBB',
      'BBBBDCBBBBBBBBBBDCBBBBBBBBBBDCBB',
      'BBBBBBBBEEBBBBBBBBEEBBBBBBBBEEBB',
      'BBBBBBBBEABBBBBBBBEABBBBBBBBEABB',
      'BBCCBBBBBBBBBBCCBBBBBBBBBBCCBBBB',
      'BBDCBBBBABBBBBDCBBBBABBBBBDCBBBB',
      'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      'ABBBEEBBBBABBBEEBBBBABBBEEBBBBAB',
      'BBBBEABBBBBBBBEABBBBBBBBEABBBBBB',
      'BBBBBBBBCCBBBBBBBBCCBBBBBBBBCCBB',
      'BCBBBBBBDCBBBCBBBBDCBBBCBBBBDCBB',
      'BBBBBBBBBBBBBFBBBBBBBBBBBBBBBBBB',
      'BBBBCCBBBBBBABBBCCBBBBBBABBBCCBB',
      'BBBBDCBBBBBBBBBBDCBBBBBBBBBBDCBB',
      'ABBBBBBBEEBBBBBBBBEEBBBBBBBBEEBB',
      'BBBBBBBBEABBBBBBBBEABBBBBBBBEABB',
      'BBBBCCBBBBBBBBCCBBBBBBBBCCBBBBBB',
      'BBBBDCBBBBABBBDCBBBBABBBDCBBBBAB',
      'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      'BBEEBBBBBCBBBBEEBBBBBCBBBBEEBBBB',
      'BBEABBBBBBBBBBEABBBBBBBBBBEABBBB',
      'BBBBBBBBCCBBBBBBBBCCBBBBBBBBCCBB',
      'ABBBBBBBDCBBBABBBBDCBBBABBBBDCBB',
      'BBBBABBBBBBBBBBBABBBBBBBBBBBABBB',
    ],
  },
  {
    key: PLAYTEST_PIXEL_TEXTURE_KEYS.energy,
    width: 16,
    height: 16,
    palette: {
      O: '#92400E',
      A: '#F59E0B',
      B: '#FACC15',
      C: '#FEF08A',
      W: '#FFFFFF',
    },
    rows: [
      '................',
      '.....OOOOOO.....',
      '...OOAAAAAAOO...',
      '..OAABBBBBAAAO..',
      '..OABBBCCCBBBO..',
      '.OABBCCWWCCBBAO.',
      '.OABCWWWWWWCBAO.',
      '.OABCWWCCWWCBAO.',
      '.OABBCCWWCCBBAO.',
      '.OABBBCCCCBBBAO.',
      '..OABBBBBBBBAO..',
      '..OAAABBBBAAAO..',
      '...OOAAAAAAOO...',
      '.....OOOOOO.....',
      '................',
      '................',
    ],
  },
  {
    key: PLAYTEST_PIXEL_TEXTURE_KEYS.crystal,
    width: 16,
    height: 16,
    palette: {
      O: '#0C4A6E',
      D: '#0284C7',
      M: '#38BDF8',
      L: '#BAE6FD',
      W: '#F0F9FF',
    },
    rows: [
      '.......OO.......',
      '......OLLO......',
      '.....OLWWLO.....',
      '....OLWMMWLO....',
      '...OLWMMMMWLO...',
      '..OLWMMMMMMWLO..',
      '.OLLMDDDDDDMLLO.',
      '.OMMDDDDDDDDMMO.',
      '.OMMDDDDDDDDMMO.',
      '..OMDDDDDDDDMO..',
      '...OMDDDDDDMO...',
      '....OMDDDDMO....',
      '.....OMDDMO.....',
      '......ODDO......',
      '.......OO.......',
      '................',
    ],
  },
];

/**
 * Deterministically registers crisp nearest-neighbor CanvasTextures for all
 * code-authored pixel-matrix sprites on a Phaser Scene. Idempotent per scene.
 */
export function registerPlaytestPixelTextures(
  scene: Phaser.Scene,
  nearestFilter: Phaser.Textures.FilterMode,
): void {
  for (const spec of PIXEL_ART_SPRITES) {
    if (scene.textures.exists(spec.key)) {
      continue;
    }

    const canvasTex = scene.textures.createCanvas(spec.key, spec.width, spec.height);
    if (!canvasTex) {
      continue;
    }

    const ctx = canvasTex.getContext();
    ctx.clearRect(0, 0, spec.width, spec.height);

    for (let y = 0; y < spec.height; y++) {
      const row = spec.rows[y] ?? '';
      for (let x = 0; x < spec.width; x++) {
        const ch = row[x];
        if (!ch || ch === '.') continue;
        const hex = spec.palette[ch];
        if (!hex) continue;
        ctx.fillStyle = hex;
        ctx.fillRect(x, y, 1, 1);
      }
    }

    canvasTex.refresh();
    canvasTex.setFilter(nearestFilter);
  }
}
