import React from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useSession } from '../context/SessionContext';
import { SecondaryButton, AccordionSection } from '../components/ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, DISCLAIMER, tierFromScore } from '../theme/tiers';
import {
  DIMENSION_META,
  EVIDENCE_MAP_TIP,
  PRODUCTS_LIST_GUIDE,
  REPORT_SECTION_LEADS,
  UNLOCK_COPY,
} from '../lib/copyPack';

type Props = NativeStackScreenProps<RootStackParamList, 'PaidReport'>;

export function PaidReportScreen({ navigation }: Props) {
  const { result, unlocked, resetSession } = useSession();

  if (!result || !unlocked) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>请先解锁本次报告</Text>
        <SecondaryButton
          label="去解锁"
          onPress={() => navigation.replace('Paywall')}
        />
      </View>
    );
  }

  const tier = tierFromScore(result.skin_score.value);
  const perception = result.perception_scores;
  const lifestyle = result.routine_paid.lifestyle_tips ?? [];
  const leads = REPORT_SECTION_LEADS;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.brand}>Averie · 完整报告</Text>
        <Text style={styles.unlockBanner}>{UNLOCK_COPY}</Text>

        {/* 1. 总览 — default expanded */}
        <AccordionSection
          title={leads.report_overview.title}
          lead={leads.report_overview.lead}
          defaultExpanded
        >
          <Text style={styles.bigScore}>{result.skin_score.value}</Text>
          <Text style={[styles.tier, { color: tier.accent }]}>
            {result.skin_score.tier_name} · {result.skin_type.label_zh}
          </Text>
          <Text style={styles.tendency}>{result.skin_tendency}</Text>
          <Text style={styles.summary}>{result.report_paid.full_summary}</Text>
          {result.concerns.map((c) => (
            <View key={c.id} style={styles.concern}>
              <Text style={styles.concernTitle}>{c.label_zh}</Text>
              <Text style={styles.concernNote}>{c.note}</Text>
            </View>
          ))}
        </AccordionSection>

        {/* 2. 分项详解 */}
        <AccordionSection
          title={leads.details.title}
          lead={leads.details.lead}
        >
          <Text style={styles.evidenceTip}>ⓘ {EVIDENCE_MAP_TIP}</Text>
          {perception.map((p) => {
            const meta = DIMENSION_META[p.key];
            return (
              <View key={p.key} style={styles.percBlock}>
                <ScoreBar
                  label={meta?.labelZh ?? p.label_zh}
                  value={p.value}
                />
                {p.status ? (
                  <Text style={styles.percStatus}>{p.status}</Text>
                ) : null}
                {meta ? (
                  <View style={styles.percHelper}>
                    <Text style={styles.percHelperLine}>
                      测什么 · {meta.measuresWhat}
                    </Text>
                    <Text style={styles.percHelperLine}>
                      常见影响因素 · {meta.commonFactors}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.percObs}>{p.observation}</Text>
                )}
                {p.detail ? (
                  <Text style={styles.percDetail}>{p.detail}</Text>
                ) : null}
              </View>
            );
          })}
        </AccordionSection>

        {/* 3. 分区提示 */}
        <AccordionSection
          title={leads.zone_tips.title}
          lead={leads.zone_tips.lead}
        >
          {result.report_paid.zone_notes.map((z) => (
            <View key={z.zone} style={styles.zone}>
              <Text style={styles.zoneTitle}>{z.zone_zh}</Text>
              <Text style={styles.zoneNote}>{z.note}</Text>
            </View>
          ))}
        </AccordionSection>

        {/* 4. 14天步骤 */}
        <AccordionSection
          title={leads.plan_14d.title}
          lead={leads.plan_14d.lead}
        >
          <Text style={styles.subHead}>晨间</Text>
          {result.routine_paid.am.map((s) => (
            <View key={`am-${s.step}`} style={styles.step}>
              <Text style={styles.stepNum}>{s.step}</Text>
              <View style={styles.stepBody}>
                <Text style={styles.stepAction}>{s.action}</Text>
                <Text style={styles.stepPurpose}>{s.purpose}</Text>
              </View>
            </View>
          ))}
          <Text style={styles.subHead}>晚间</Text>
          {result.routine_paid.pm.map((s) => (
            <View key={`pm-${s.step}`} style={styles.step}>
              <Text style={styles.stepNum}>{s.step}</Text>
              <View style={styles.stepBody}>
                <Text style={styles.stepAction}>{s.action}</Text>
                <Text style={styles.stepPurpose}>{s.purpose}</Text>
              </View>
            </View>
          ))}
          {result.routine_paid.weekly.length > 0 ? (
            <>
              <Text style={styles.subHead}>每周</Text>
              {result.routine_paid.weekly.map((w) => (
                <Text key={w} style={styles.bullet}>
                  · {w}
                </Text>
              ))}
            </>
          ) : null}
        </AccordionSection>

        {/* 5. 产品推荐 */}
        <AccordionSection
          title={leads.products.title}
          lead={leads.products.lead}
        >
          <Text style={styles.noLinkNote}>{PRODUCTS_LIST_GUIDE}</Text>
          {result.products_paid.items.map((p) => (
            <View key={p.slot} style={styles.product}>
              <View style={styles.productCatWrap}>
                <Text style={styles.productCat}>{p.category_zh}</Text>
              </View>
              <Text style={styles.productName}>
                {p.name} · {p.model}
              </Text>
              <Text style={styles.productMapped}>
                对应关注点 · {p.mapped_concern}
              </Text>
              <Text style={styles.productWhy}>{p.why}</Text>
            </View>
          ))}
        </AccordionSection>

        {/* 6. 注意事项 */}
        <AccordionSection title={leads.notes.title} lead={leads.notes.lead}>
          {result.routine_paid.avoid.map((a) => (
            <Text key={a} style={styles.bulletMuted}>
              · 避开：{a}
            </Text>
          ))}
          {lifestyle.map((t) => (
            <Text key={t} style={styles.bullet}>
              · {t}
            </Text>
          ))}
          {result.routine_paid.avoid.length === 0 && lifestyle.length === 0 ? (
            <Text style={styles.bulletMuted}>暂无额外注意事项</Text>
          ) : null}
        </AccordionSection>

        <View style={styles.endBlock}>
          <Text style={styles.endNote}>
            本次报告已解锁。如需再次分析，请重新开始流程（将再次付费）。
          </Text>
          <SecondaryButton
            label="结束并回到首页"
            onPress={() => {
              resetSession();
              navigation.reset({ index: 0, routes: [{ name: 'Gender' }] });
            }}
          />
        </View>

        <Text style={styles.disclaimer}>{DISCLAIMER}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${value}%` }]} />
      </View>
      <Text style={styles.barValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 24, paddingTop: 48, paddingBottom: 48 },
  brand: {
    fontSize: 12,
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  unlockBanner: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
  },
  bigScore: {
    fontSize: 64,
    fontWeight: '200',
    color: colors.text,
    letterSpacing: -3,
  },
  tier: { fontSize: 16, fontWeight: '700', marginBottom: 8, marginTop: 2 },
  tendency: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },
  summary: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
  },
  subHead: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
    marginTop: 10,
    marginBottom: 10,
  },
  percBlock: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  evidenceTip: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 12,
  },
  percObs: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
    marginBottom: 6,
  },
  percHelper: {
    marginTop: 4,
    marginBottom: 6,
    gap: 2,
  },
  percHelperLine: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
  percStatus: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  percDetail: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  concern: { marginBottom: 12 },
  concernTitle: { color: colors.text, fontWeight: '700', fontSize: 15 },
  concernNote: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
    lineHeight: 19,
  },
  zone: { marginBottom: 10 },
  zoneTitle: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  zoneNote: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
    lineHeight: 19,
  },
  step: { flexDirection: 'row', marginBottom: 14, alignItems: 'flex-start' },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(232,160,176,0.2)',
    color: colors.primary,
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: '700',
    fontSize: 13,
    overflow: 'hidden',
    marginRight: 12,
  },
  stepBody: { flex: 1 },
  stepAction: { color: colors.text, fontWeight: '700', fontSize: 14 },
  stepPurpose: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  bullet: { color: colors.textSecondary, fontSize: 13, marginBottom: 6 },
  bulletMuted: { color: colors.textMuted, fontSize: 13, marginBottom: 6 },
  noLinkNote: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 14,
    lineHeight: 17,
  },
  product: {
    marginBottom: 18,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  productCatWrap: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(232,160,176,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  productCat: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  productName: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 6,
  },
  productMapped: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  productWhy: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  barLabel: { width: 88, color: colors.textSecondary, fontSize: 12 },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  barValue: {
    width: 28,
    textAlign: 'right',
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  endBlock: { marginTop: 8, marginBottom: 16, gap: 12 },
  endNote: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  disclaimer: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 15,
  },
  fallback: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  fallbackText: { color: colors.text, fontSize: 16 },
});
