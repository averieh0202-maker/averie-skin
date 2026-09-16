import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useSession } from '../context/SessionContext';
import { PrimaryButton, SecondaryButton } from '../components/ui';
import { ReportPage, EngineNote, MetricRow, s } from '../components/report';
import { colors } from '../theme/tiers';
import { CTA_COPY } from '../lib/copyPack';
type Props = NativeStackScreenProps<RootStackParamList, 'FreeResult'>;
export function FreeResultScreen({ navigation }: Props) {
  const { result } = useSession();
  if (!result)
    return (
      <ReportPage label="皮肤分析">
        <Text style={s.title}>还没有分析结果</Text>
        <SecondaryButton label="返回首页" onPress={() => navigation.navigate('Gender')} />
      </ReportPage>
    );
  const complete = result.analysis_status === 'complete';
  const priorities = result.summary_free.priorities.map((k) =>
    result.perception_scores.find((d) => d.key === k)!,
  );
  return (
    <ReportPage label="我的皮肤报告">
      <EngineNote result={result} />
      <Text style={s.eyebrow}>这次的皮肤状态</Text>
      <View style={local.hero}>
        <View style={local.heroText}>
          <Text style={s.title}>{result.skin_type.label_zh}</Text>
          <Text style={local.tier}>{result.skin_score.tier_name}</Text>
        </View>
        <View style={local.scoreBox}>
          <Text style={local.score}>{result.skin_score.value ?? '—'}</Text>
          <Text style={local.scoreLabel}>外观评分 / 100</Text>
        </View>
      </View>
      <Text style={s.body}>{result.skin_type.explanation}</Text>
      {complete &&
      result.perception_scores.find((d) => d.value !== null && d.value >= 80) ? (
        <Text style={[s.body, { marginTop: 12 }]}>
          {
            result.perception_scores.find((d) => d.value !== null && d.value >= 80)!
              .observation
          }
        </Text>
      ) : null}
      <Text style={[s.small, { marginTop: 12 }]}>
        分数越高，表示照片中这一项的表现越好。
      </Text>
      {!complete ? (
        <View style={[s.actionBox, { marginTop: 20 }]}>
          <Text style={s.action}>{result.quality_note}</Text>
          <View style={{ height: 12 }} />
          <SecondaryButton
            label="调整照片"
            onPress={() => navigation.replace('Selfie')}
          />
        </View>
      ) : null}
      {priorities.length > 0 ? (
        <View style={s.section}>
          <Text style={s.sectionTitle}>
            {priorities.length === 1 ? '先留意这件事' : '先留意这两件事'}
          </Text>
          {priorities.map((d, i) => (
            <View key={d.key} style={local.priority}>
              <Text style={local.number}>{String(i + 1).padStart(2, '0')}</Text>
              <View style={{ flex: 1 }}>
                <Text style={local.priorityTitle}>{d.observation}</Text>
                <Text style={s.body}>{d.action}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={[s.card, { marginTop: 24 }]}>
          <Text style={s.body}>{result.summary_free.headline}</Text>
        </View>
      )}
      <View style={s.section}>
        <View style={s.between}>
          <Text style={s.sectionTitle}>逐项看看</Text>
          <Text style={s.small}>7 项外观观察</Text>
        </View>
        <View style={s.card}>
          {result.perception_scores.map((d) => (
            <MetricRow key={d.key} dim={d} />
          ))}
        </View>
      </View>
      {complete ? (
        <View style={local.cta}>
          <Text style={local.ctaTitle}>把结果变成每天的护理</Text>
          <Text style={[s.body, { marginBottom: 18 }]}>{CTA_COPY.secondary}</Text>
          <PrimaryButton
            label={result.meta.engine === 'mock' ? '查看示例护理方案' : CTA_COPY.primary}
            onPress={() => navigation.navigate('Paywall')}
          />
          <Text style={[s.small, { textAlign: 'center', marginTop: 10 }]}>
            含每个品类的取舍、成分与使用方法
          </Text>
        </View>
      ) : null}
      <Text style={[s.small, { marginTop: 28 }]}>{result.disclaimer}</Text>
    </ReportPage>
  );
}
const local = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 10,
    marginBottom: 18,
  },
  heroText: { flex: 1 },
  tier: { fontSize: 14, color: colors.textSecondary, marginTop: 8 },
  scoreBox: {
    backgroundColor: '#E9EDE2',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 18,
    alignItems: 'center',
    minWidth: 112,
  },
  score: {
    fontSize: 54,
    lineHeight: 64,
    fontWeight: '300',
    letterSpacing: -2,
    color: colors.primary,
  },
  scoreLabel: { fontSize: 11, color: colors.textSecondary },
  priority: {
    flexDirection: 'row',
    gap: 16,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingVertical: 18,
  },
  number: { fontSize: 14, color: '#879582', marginTop: 4 },
  priorityTitle: {
    fontSize: 17,
    lineHeight: 27,
    color: colors.text,
    fontWeight: '500',
    marginBottom: 6,
  },
  cta: { marginTop: 28, paddingTop: 6 },
  ctaTitle: {
    fontSize: 20,
    lineHeight: 30,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
});
