import { TierId } from '../types/analysis';
export const colors = {
  bg: '#F6F5F1',
  surface: '#FFFFFF',
  surfaceElevated: '#ECEFE7',
  text: '#25332D',
  textSecondary: '#606C65',
  textMuted: '#737B74',
  primary: '#304F40',
  primaryDark: '#233D31',
  border: '#E2E5DE',
  danger: '#97543F',
  success: '#456B50',
};
export const TIERS: {
  id: TierId;
  name: string;
  nameEn: string;
  range: [number, number];
  accent: string;
}[] = [
  {
    id: 'renew',
    name: '先做基础护理',
    nameEn: 'Essential care',
    range: [0, 39],
    accent: colors.danger,
  },
  {
    id: 'repair',
    name: '需要多些关注',
    nameEn: 'More attention',
    range: [40, 59],
    accent: colors.danger,
  },
  {
    id: 'steady',
    name: '局部值得留意',
    nameEn: 'Focused care',
    range: [60, 79],
    accent: colors.primary,
  },
  {
    id: 'glow',
    name: '整体表现不错',
    nameEn: 'Looking good',
    range: [80, 89],
    accent: colors.primary,
  },
  {
    id: 'porcelain',
    name: '整体比较均衡',
    nameEn: 'Balanced appearance',
    range: [90, 100],
    accent: colors.primary,
  },
];
export function tierFromScore(score: number) {
  return TIERS.find((t) => score >= t.range[0] && score <= t.range[1]) ?? TIERS[0];
}
export const DISCLAIMER =
  '根据照片可见特征提供外观评估与护肤参考，不能替代医疗建议。光线、妆容和拍摄条件会影响结果。';
