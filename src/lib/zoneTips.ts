import { FaceRegion } from '../types/analysis';
export const ZONE_ZH: Record<FaceRegion, string> = {
  forehead: '额头',
  nose: '鼻子',
  cheeks: '两颊',
  chin: '下巴',
  periocular: '眼周',
  perioral: '嘴周',
};
export const ZONE_DISPLAY_ORDER = Object.keys(ZONE_ZH) as FaceRegion[];
