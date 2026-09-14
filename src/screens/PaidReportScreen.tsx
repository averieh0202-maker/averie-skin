import React from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useSession } from '../context/SessionContext';
import { SecondaryButton, SectionCard } from '../components/ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, DISCLAIMER, tierFromScore } from '../theme/tiers';

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
  const bd = result.score_breakdown_paid;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.brand}>Averie · 完整报告</Text>
        <Text style={styles.bigScore}>{result.skin_score.value}</Text>
        <Text style={[styles.tier, { color: tier.accent }]}>
          {result.skin_score.tier_name} · {result.skin_type.label_zh}
        </Text>
        <Text style={styles.summary}>{result.report_paid.full_summary}</Text>

        <SectionCard title="分项评分">
          <ScoreBar label="光泽观感" value={bd.glow} />
          <ScoreBar label="匀净度" value={bd.evenness} />
          <ScoreBar label="澄净度" value={bd.clarity} />
          <ScoreBar label="屏障观感" value={bd.barrier_appearance} />
        </SectionCard>

        <SectionCard title="关注点">
          {result.concerns.map((c) => (
            <View key={c.id} style={styles.concern}>
              <Text style={styles.concernTitle}>{c.label_zh}</Text>
              <Text style={styles.concernNote}>{c.note}</Text>
            </View>
          ))}
        </SectionCard>

        <SectionCard title="分区说明">
          {result.report_paid.zone_notes.map((z) => (
            <View key={z.zone} style={styles.zone}>
              <Text style={styles.zoneTitle}>{z.zone_zh}</Text>
              <Text style={styles.zoneNote}>{z.note}</Text>
            </View>
          ))}
        </SectionCard>

        <SectionCard title="14 天步骤 · 晨间">
          {result.routine_paid.am.map((s) => (
            <View key={`am-${s.step}`} style={styles.step}>
              <Text style={styles.stepNum}>{s.step}</Text>
              <View style={styles.stepBody}>
                <Text style={styles.stepAction}>{s.action}</Text>
                <Text style={styles.stepPurpose}>{s.purpose}</Text>
              </View>
            </View>
          ))}
        </SectionCard>

        <SectionCard title="14 天步骤 · 晚间">
          {result.routine_paid.pm.map((s) => (
            <View key={`pm-${s.step}`} style={styles.step}>
              <Text style={styles.stepNum}>{s.step}</Text>
              <View style={styles.stepBody}>
                <Text style={styles.stepAction}>{s.action}</Text>
                <Text style={styles.stepPurpose}>{s.purpose}</Text>
              </View>
            </View>
          ))}
        </SectionCard>

        {(result.routine_paid.weekly.length > 0 ||
          result.routine_paid.avoid.length > 0) && (
          <SectionCard title="每周 / 建议避开">
            {result.routine_paid.weekly.map((w) => (
              <Text key={w} style={styles.bullet}>
                · {w}
              </Text>
            ))}
            {result.routine_paid.avoid.map((a) => (
              <Text key={a} style={styles.bulletMuted}>
                · 避开：{a}
              </Text>
            ))}
          </SectionCard>
        )}

        <SectionCard title="产品参考（名称 + 型号）">
          <Text style={styles.noLinkNote}>
            仅展示名称与型号，无购买链接、无广告按钮。
          </Text>
          {result.products_paid.items.map((p) => (
            <View key={p.slot} style={styles.product}>
              <Text style={styles.productName}>
                {p.name} · {p.model}
              </Text>
              <Text style={styles.productWhy}>{p.why}</Text>
            </View>
          ))}
        </SectionCard>

        {/* No retest entry — starting over requires paying again */}
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
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${value}%` }]} />
      </View>
      <Text style={styles.barValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 24, paddingTop: 56, paddingBottom: 48 },
  brand: {
    fontSize: 12,
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  bigScore: {
    fontSize: 56,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -2,
  },
  tier: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  summary: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 20,
  },
  concern: { marginBottom: 12 },
  concernTitle: { color: colors.text, fontWeight: '700', fontSize: 15 },
  concernNote: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  zone: { marginBottom: 10 },
  zoneTitle: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  zoneNote: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  step: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-start' },
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
  stepPurpose: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  bullet: { color: colors.textSecondary, fontSize: 13, marginBottom: 6 },
  bulletMuted: { color: colors.textMuted, fontSize: 13, marginBottom: 6 },
  noLinkNote: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 12,
  },
  product: {
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  productName: { color: colors.text, fontWeight: '700', fontSize: 14 },
  productWhy: { color: colors.textSecondary, fontSize: 12, marginTop: 3 },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  barLabel: { width: 72, color: colors.textSecondary, fontSize: 12 },
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
