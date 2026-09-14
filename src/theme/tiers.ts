import { TierId } from '../types/analysis';

export interface TierVisual {
  id: TierId;
  name: string;
  nameEn: string;
  range: [number, number];
  /** Background gradient */
  gradient: [string, string, string];
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  scoreColor: string;
  accent: string;
  cardBg: string;
  cardBorder: string;
  glowOpacity: number;
  subtitle: string;
}

export const TIERS: TierVisual[] = [
  {
    id: 'renew',
    name: '待焕新',
    nameEn: 'Renew',
    range: [0, 39],
    gradient: ['#2A2A2E', '#3D3A38', '#4A4540'],
    badgeBg: 'rgba(180,170,160,0.15)',
    badgeBorder: 'rgba(180,170,160,0.35)',
    badgeText: '#C8C0B8',
    scoreColor: '#E8E0D8',
    accent: '#A89F94',
    cardBg: 'rgba(255,255,255,0.06)',
    cardBorder: 'rgba(255,255,255,0.1)',
    glowOpacity: 0.15,
    subtitle: '低饱和柔雾',
  },
  {
    id: 'repair',
    name: '修护期',
    nameEn: 'Repair',
    range: [40, 59],
    gradient: ['#1E2A32', '#2A3D48', '#3A5060'],
    badgeBg: 'rgba(140,180,200,0.18)',
    badgeBorder: 'rgba(140,180,200,0.4)',
    badgeText: '#B8D4E4',
    scoreColor: '#D8ECF4',
    accent: '#7BA8C0',
    cardBg: 'rgba(255,255,255,0.07)',
    cardBorder: 'rgba(140,180,200,0.2)',
    glowOpacity: 0.28,
    subtitle: '淡色光晕',
  },
  {
    id: 'steady',
    name: '稳定光',
    nameEn: 'Steady',
    range: [60, 74],
    gradient: ['#1A1C20', '#2C3038', '#3A404C'],
    badgeBg: 'rgba(255,255,255,0.12)',
    badgeBorder: 'rgba(255,255,255,0.45)',
    badgeText: '#F5F5F5',
    scoreColor: '#FFFFFF',
    accent: '#E8E8EC',
    cardBg: 'rgba(255,255,255,0.08)',
    cardBorder: 'rgba(255,255,255,0.22)',
    glowOpacity: 0.4,
    subtitle: '干净白光',
  },
  {
    id: 'glow',
    name: '透亮',
    nameEn: 'Glow',
    range: [75, 89],
    gradient: ['#1A2838', '#244060', '#3A6A8A'],
    badgeBg: 'rgba(120,200,230,0.2)',
    badgeBorder: 'rgba(160,220,255,0.55)',
    badgeText: '#C8F0FF',
    scoreColor: '#E8F8FF',
    accent: '#6EC8E8',
    cardBg: 'rgba(100,180,220,0.12)',
    cardBorder: 'rgba(140,210,240,0.35)',
    glowOpacity: 0.55,
    subtitle: '水光折射',
  },
  {
    id: 'porcelain',
    name: '瓷感',
    nameEn: 'Porcelain',
    range: [90, 100],
    gradient: ['#1C1428', '#2E2048', '#4A3870'],
    badgeBg: 'rgba(220,200,255,0.22)',
    badgeBorder: 'rgba(255,230,180,0.65)',
    badgeText: '#FFE8C8',
    scoreColor: '#FFF8F0',
    accent: '#E8C8FF',
    cardBg: 'rgba(200,180,255,0.12)',
    cardBorder: 'rgba(255,220,160,0.45)',
    glowOpacity: 0.7,
    subtitle: '玻璃高光',
  },
];

export function tierFromScore(score: number): TierVisual {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  for (const t of TIERS) {
    if (clamped >= t.range[0] && clamped <= t.range[1]) return t;
  }
  return TIERS[2];
}

export const colors = {
  bg: '#0C0C0E',
  surface: '#16161A',
  surfaceElevated: '#1E1E24',
  text: '#F4F4F6',
  textSecondary: '#9A9AA4',
  textMuted: '#6A6A74',
  primary: '#E8A0B0',
  primaryDark: '#C87890',
  border: 'rgba(255,255,255,0.08)',
  danger: '#E87070',
  success: '#70C8A0',
};

export const DISCLAIMER =
  'Averie Skin基于自拍图像给出护肤向观察与护理方向参考，不构成医疗诊断或治疗效果承诺。';
