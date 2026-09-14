import React, { useState } from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useSession } from '../context/SessionContext';
import { AnalyzerEngine, Gender } from '../types/analysis';
import {
  OptionCard,
  PrimaryButton,
  Screen,
  Subtitle,
  Title,
  DisclaimerFooter,
} from '../components/ui';
import { DISCLAIMER, colors } from '../theme/tiers';

type Props = NativeStackScreenProps<RootStackParamList, 'Gender'>;

const OPTIONS: Array<{ value: Gender; label: string; emoji: string }> = [
  { value: 'female', label: '女', emoji: '♀' },
  { value: 'male', label: '男', emoji: '♂' },
  { value: 'unspecified', label: '不愿说明', emoji: '·' },
];

const ENGINE_OPTS: Array<{ value: AnalyzerEngine; label: string; hint: string }> =
  [
    { value: 'mock', label: 'Mock', hint: '本地演示' },
    { value: 'qwen', label: 'Qwen', hint: '百炼视觉' },
    { value: 'auto', label: 'Auto', hint: '有 Key 用 Qwen' },
  ];

export function GenderScreen({ navigation }: Props) {
  const {
    gender,
    setGender,
    analyzerEngine,
    setAnalyzerEngine,
    hasDashScopeKey,
  } = useSession();
  const [selected, setSelected] = useState<Gender | null>(gender);

  return (
    <Screen>
      <Text style={styles.brand}>Averie Skin</Text>
      <View style={styles.progress}>
        <View style={[styles.dot, styles.dotActive]} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View>
      <Title>你的性别</Title>
      <Subtitle>仅用于外观评估的先验参考，不会单独决定分数。</Subtitle>

      <View style={styles.options}>
        {OPTIONS.map((o) => (
          <OptionCard
            key={o.value}
            label={o.label}
            emoji={o.emoji}
            selected={selected === o.value}
            onPress={() => setSelected(o.value)}
          />
        ))}
      </View>

      <View style={styles.engineBlock}>
        <Text style={styles.engineTitle}>分析引擎（开发/测试）</Text>
        <View style={styles.engineRow}>
          {ENGINE_OPTS.map((e) => {
            const on = analyzerEngine === e.value;
            return (
              <Pressable
                key={e.value}
                onPress={() => setAnalyzerEngine(e.value)}
                style={[styles.engineChip, on && styles.engineChipOn]}
              >
                <Text style={[styles.engineLabel, on && styles.engineLabelOn]}>
                  {e.label}
                </Text>
                <Text style={styles.engineHint}>{e.hint}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.engineNote}>
          {hasDashScopeKey
            ? '已检测到本地 DashScope Key。选 Qwen 后自拍将走 qwen3-vl-plus；失败会友好提示并回退 Mock。'
            : '未检测到 Key时 Qwen 会回退 Mock。在项目根目录 .env 写入 EXPO_PUBLIC_DASHSCOPE_API_KEY 后重启 expo。'}
        </Text>
      </View>

      <View style={styles.spacer} />
      <PrimaryButton
        label="下一步"
        disabled={!selected}
        onPress={() => {
          if (!selected) return;
          setGender(selected);
          navigation.navigate('Age');
        }}
      />
      <DisclaimerFooter text={DISCLAIMER} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: 20,
    marginTop: 4,
  },
  progress: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 28,
  },
  dot: {
    width: 28,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  dotActive: { backgroundColor: '#E8A0B0' },
  options: { marginTop: 4 },
  spacer: { flex: 1, minHeight: 16 },
  engineBlock: {
    marginTop: 20,
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  engineTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
  },
  engineRow: { flexDirection: 'row', gap: 8 },
  engineChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  engineChipOn: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(232,160,176,0.12)',
  },
  engineLabel: { color: colors.textSecondary, fontWeight: '700', fontSize: 13 },
  engineLabelOn: { color: colors.primary },
  engineHint: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  engineNote: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 10,
  },
});
