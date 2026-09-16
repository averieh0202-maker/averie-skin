import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnalysisResult, PerceptionDimension, ProductItem } from '../types/analysis';
import { colors } from '../theme/tiers';
import { DIMENSION_META } from '../lib/copyPack';
export function ReportPage({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.nav}>
          <Text style={s.brand}>
            averie<Text style={s.brandSmall}> skin</Text>
          </Text>
          <Text style={s.eyebrow}>{label}</Text>
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
export function EngineNote({ result }: { result: AnalysisResult }) {
  const [open, setOpen] = useState(false);
  const mock = result.meta.engine === 'mock';
  return (
    <View style={{ marginBottom: 16 }}>
      {mock ? (
        <View style={s.demo}>
          <Text style={s.demoText}>示例报告，未分析你的照片</Text>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={{ paddingVertical: 12 }}
      >
        <Text style={s.small}>
          本次引擎 {mock ? 'Mock 示例' : result.meta.engine === 'qwen' ? 'Qwen' : 'AI'}　
          {open ? '收起信息' : '查看信息'}
        </Text>
      </Pressable>
      {open ? (
        <Text selectable style={s.small}>
          {result.meta.model_id}
          {'\n'}
          {result.meta.analyzed_at.slice(0, 10)}
        </Text>
      ) : null}
    </View>
  );
}
export function MetricRow({
  dim,
  detail = false,
}: {
  dim: PerceptionDimension;
  detail?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const attention = dim.value !== null && dim.value < 60;
  return (
    <View style={s.metric}>
      <View style={s.between}>
        <Text style={s.metricTitle}>{dim.label_zh}</Text>
        <View style={s.metricRight}>
          <Text style={[s.status, attention && s.attention]}>{dim.status}</Text>
          <Text style={s.metricValue}>{dim.value ?? '—'}</Text>
        </View>
      </View>
      <Text style={s.body}>{dim.observation}</Text>
      {dim.value !== null ? (
        <View style={s.track}>
          <View
            style={[
              s.fill,
              {
                width: `${dim.value}%`,
                backgroundColor: attention ? '#AF8167' : '#8B9E87',
              },
            ]}
          />
        </View>
      ) : null}
      {detail ? (
        <>
          <Text style={s.paragraph}>{dim.detail}</Text>
          <View style={s.actionBox}>
            <Text style={s.action}>{dim.action}</Text>
          </View>
        </>
      ) : null}
      {detail ? (
        <>
          <Pressable
            onPress={() => setOpen(!open)}
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            style={{ paddingVertical: 12 }}
          >
            <Text style={s.small}>{open ? '收起说明' : '了解这一项'}</Text>
          </Pressable>
          {open ? (
            <Text style={s.small}>{DIMENSION_META[dim.key].explanation}</Text>
          ) : null}
        </>
      ) : null}
    </View>
  );
}
export function CandidateCard({ item, index }: { item: ProductItem; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={s.candidate}>
      <Text style={s.eyebrow}>{index === 0 ? '可选产品' : '另一种选择'}</Text>
      <Text style={s.productName}>{item.name}</Text>
      <Text style={s.small}>{item.model}</Text>
      <Text style={s.small}>
        {item.mapped_concerns.length
          ? `结合本次${item.mapped_concerns.map((k) => DIMENSION_META[k].labelZh).join('、')}的观察选择。`
          : '用于日常基础护理。'}
      </Text>
      <Text style={s.paragraph}>{item.reasons[1]}</Text>
      <Pressable
        onPress={() => setOpen(!open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={s.detailButton}
      >
        <Text style={s.link}>{open ? '收起产品详情' : '查看成分与用法'}</Text>
        <Text style={s.link}>{open ? '−' : '+'}</Text>
      </Pressable>
      {open ? (
        <View>
          <Text style={s.subheading}>怎么搭配</Text>
          <Text style={s.body}>{item.reasons.slice(2).join('')}</Text>
          <Text style={s.subheading}>主要成分</Text>
          {item.ingredients.map((i) => (
            <View key={i.name} style={s.ingredient}>
              <Text style={s.ingredientName}>{i.name}</Text>
              <Text style={s.small}>{i.role}</Text>
            </View>
          ))}
          <Text style={s.subheading}>怎么用</Text>
          <Text style={s.body}>{item.usage}</Text>
          <Text style={s.subheading}>使用前留意</Text>
          <Text style={s.body}>{item.caution}</Text>
          <Text style={[s.small, { marginTop: 12 }]}>
            版本 {item.region}　资料核对 {item.checked_on}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
export const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 36,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  brand: { fontSize: 29, fontWeight: '500', letterSpacing: -1.2, color: colors.primary },
  brandSmall: { fontSize: 16, letterSpacing: 0, fontWeight: '400' },
  eyebrow: { fontSize: 12, color: colors.textMuted, letterSpacing: 0.5 },
  title: {
    fontSize: 30,
    fontWeight: '600',
    lineHeight: 42,
    color: colors.text,
    letterSpacing: -0.7,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: '600',
    lineHeight: 30,
    color: colors.text,
    marginBottom: 10,
  },
  subheading: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginTop: 20,
    marginBottom: 10,
  },
  body: { fontSize: 15, lineHeight: 24, color: colors.textSecondary },
  paragraph: { fontSize: 15, lineHeight: 25, color: colors.textSecondary, marginTop: 12 },
  small: { fontSize: 13, lineHeight: 21, color: colors.textMuted },
  between: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  section: { marginTop: 28 },
  card: {
    backgroundColor: colors.surface,
    padding: 22,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  demo: {
    backgroundColor: '#EEE9DA',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  demoText: { fontSize: 13, lineHeight: 20, color: '#746344' },
  metric: {
    paddingVertical: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: 8,
  },
  metricTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  metricRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  metricValue: {
    fontSize: 20,
    fontWeight: '500',
    color: colors.primary,
    minWidth: 32,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  status: { fontSize: 12, color: colors.textMuted },
  attention: { color: colors.danger },
  track: { height: 3, backgroundColor: '#EDEFE9', borderRadius: 2, marginTop: 3 },
  fill: { height: 3, borderRadius: 2 },
  actionBox: { padding: 14, backgroundColor: '#EFF2EB', borderRadius: 10, marginTop: 10 },
  action: { fontSize: 14, lineHeight: 23, color: colors.primary },
  link: { fontSize: 14, fontWeight: '500', color: colors.primary },
  candidate: { padding: 18, backgroundColor: '#F6F7F2', borderRadius: 14, marginTop: 14 },
  productName: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 26,
    color: colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  detailButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  ingredient: { marginBottom: 12 },
  ingredientName: { fontSize: 14, lineHeight: 23, fontWeight: '500', color: colors.text },
});
