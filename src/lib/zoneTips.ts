/**
 * Multi-region zone_tips builder.
 * Prefer 额头 / 鼻子 / 眼周 / 脸颊 / 下颌·口周 when evidence exists;
 * hide zones without basis — never collapse to cheeks-only.
 */
import {
  Concern,
  FaceRegion,
  PerceptionDimension,
  PerceptionKey,
  ZoneNote,
} from '../types/analysis';

export const ZONE_ZH: Record<FaceRegion, string> = {
  forehead: '前额',
  t_zone: 'T区',
  cheeks: '脸颊',
  chin: '下颌',
  nose: '鼻子',
  periocular: '眼周',
  perioral: '口周',
  full_face: '全脸',
};

/** Preferred display order for demos / paid accordion */
export const ZONE_DISPLAY_ORDER: FaceRegion[] = [
  'forehead',
  'nose',
  'periocular',
  'cheeks',
  'chin',
  'perioral',
];

/** Dim → primary zones that typically show that signal */
const DIM_ZONE_MAP: Record<PerceptionKey, FaceRegion[]> = {
  radiance: ['cheeks', 'forehead'],
  oiliness: ['forehead', 'nose'],
  pores: ['nose', 'cheeks'],
  texture: ['cheeks', 'forehead'],
  tone_evenness: ['cheeks', 'perioral'],
  fine_lines: ['periocular', 'forehead'],
  redness: ['cheeks', 'nose'],
};

const ZONE_TIP_BANK: Record<FaceRegion, string[]> = {
  forehead: [
    '前额光线下略亮或纹理更清楚，清洁与保湿宜薄、忌搓洗。',
    '额头分区先观察油光与细纹，步骤做稳比猛攻更重要。',
  ],
  nose: [
    '鼻翼/鼻梁毛孔或油光更有存在感，清透质地通常更友好。',
    '鼻子区域常见出油与毛孔同框，温和见底清洁即可。',
  ],
  periocular: [
    '眼周更适合润、用轻，细纹多半先和缺水、表情有关。',
    '眼下/外眼角浅纹时，少刺激、多保湿往往更先。',
  ],
  cheeks: [
    '两颊看光泽、泛红与纹理更清楚，保湿可略厚于T区。',
    '脸颊若偏干或薄红，步骤做少、做温和更合适。',
  ],
  chin: [
    '下颌/下巴零星凸起或干纹感时，清洁别过度、保湿别闷。',
    '下巴分区波动常见，观察一两周再加减刺激成分。',
  ],
  perioral: [
    '口周深浅差或干感时，防晒与薄层保湿更值得坚持。',
    '嘴周护理宜轻，美白概念不必急着叠很多。',
  ],
  t_zone: [
    'T区油光常先于两颊出现，控油清爽不拔干。',
    '面中更亮时，清洁见底、保湿分区涂更稳。',
  ],
  full_face: [
    '整体观感偏统一时，维持基础节奏即可。',
  ],
};

function seeded(seed: number, salt: number): number {
  const x = Math.sin(seed * 9999 + salt * 77.7) * 10000;
  return x - Math.floor(x);
}

/** Map raw region tags onto display zones (drop full_face; split t_zone). */
function expandRegion(r: FaceRegion): FaceRegion[] {
  if (r === 'full_face') return [];
  if (r === 't_zone') return ['forehead', 'nose'];
  return [r];
}

function pickTip(zone: FaceRegion, seed: number, salt: number): string {
  const bank = ZONE_TIP_BANK[zone] ?? ZONE_TIP_BANK.cheeks;
  const idx = Math.floor(seeded(seed, salt) * bank.length) % bank.length;
  return bank[idx];
}

/**
 * Build 3–5 zone tips from concerns + low perception dims.
 * Guarantees multi-zone coverage when any non-cheek evidence exists.
 */
export function buildZoneNotes(
  seed: number,
  concerns: Concern[],
  perception: PerceptionDimension[],
): ZoneNote[] {
  /** zone → best note (first write wins; concern notes preferred) */
  const byZone = new Map<FaceRegion, string>();

  const add = (zone: FaceRegion, note: string) => {
    if (!ZONE_DISPLAY_ORDER.includes(zone) && zone !== 't_zone') return;
    const expanded = expandRegion(zone);
    for (const z of expanded.length ? expanded : [zone]) {
      if (!ZONE_DISPLAY_ORDER.includes(z)) continue;
      if (!byZone.has(z)) byZone.set(z, note || pickTip(z, seed, z.length));
    }
  };

  // 1) Concerns — use ALL regions (not only first), so cheeks-first pools don't dominate
  concerns.forEach((c, i) => {
    const regions = c.regions.length ? c.regions : (['cheeks'] as FaceRegion[]);
    regions.forEach((r, j) => {
      // Prefer a short zone-specific tip; fall back to concern note once per concern
      const note =
        j === 0 && c.note
          ? c.note.length > 48
            ? pickTip(expandRegion(r)[0] ?? 'cheeks', seed, 20 + i)
            : c.note
          : pickTip(expandRegion(r)[0] ?? r, seed, 30 + i * 3 + j);
      add(r, note);
    });
  });

  // 2) Low dims contribute zone evidence (status 差/中)
  const sorted = [...perception].sort((a, b) => a.value - b.value);
  sorted.slice(0, 4).forEach((d, i) => {
    if (d.value >= 72) return; // only when there's a relative weakness
    const zones = DIM_ZONE_MAP[d.key] ?? [];
    zones.forEach((z, j) => add(z, pickTip(z, seed, 40 + i * 5 + j)));
  });

  // 3) Ensure demos typically show multiple face zones (≥3 when possible)
  const ensure: FaceRegion[] = ['forehead', 'nose', 'periocular', 'cheeks', 'chin'];
  if (byZone.size < 3) {
    for (const z of ensure) {
      if (byZone.size >= 4) break;
      if (!byZone.has(z)) add(z, pickTip(z, seed, 80 + z.charCodeAt(0)));
    }
  }

  // 4) Never cheeks-only: if somehow only cheeks, pull nose + forehead + periocular
  if (byZone.size === 1 && byZone.has('cheeks')) {
    add('forehead', pickTip('forehead', seed, 91));
    add('nose', pickTip('nose', seed, 92));
    add('periocular', pickTip('periocular', seed, 93));
  }

  const notes: ZoneNote[] = ZONE_DISPLAY_ORDER.filter((z) => byZone.has(z)).map(
    (z) => ({
      zone: z,
      zone_zh: ZONE_ZH[z],
      note: byZone.get(z)!,
    }),
  );

  // Cap at 5 short tips
  return notes.slice(0, 5);
}
