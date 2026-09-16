import React, { useState } from 'react';
import { View, StyleSheet, Text, Pressable, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useSession } from '../context/SessionContext';
import { AnalyzerEngine, Gender } from '../types/analysis';
import {
  OptionCard,
  PrimaryButton,
  SecondaryButton,
  AccordionSection,
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
  { value: 'unspecified', label: '不愿说明', emoji: '' },
];

const ENGINE_OPTS: Array<{ value: AnalyzerEngine; label: string; hint: string }> = [
  { value: 'mock', label: 'Mock', hint: '本地演示' },
  { value: 'qwen', label: 'Qwen', hint: '百炼视觉' },
  { value: 'auto', label: 'Auto', hint: '有服务用 Qwen' },
];

export function GenderScreen({ navigation }: Props) {
  const {
    gender,
    viewDemo,
    setGender,
    analyzerEngine,
    setAnalyzerEngine,
    hasAnalyzeService,
  } = useSession();
  const [selected, setSelected] = useState<Gender | null>(gender);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 12 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.brand}>Averie Skin</Text>
        <View style={styles.progress}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
        <Title>你的性别</Title>
        <Subtitle>用于基础信息，不会根据性别直接加减分。</Subtitle>

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

        <AccordionSection title="分析设置">
          <Text style={styles.engineTitle}>分析引擎（开发/测试）</Text>
          <View style={styles.engineRow}>
            {ENGINE_OPTS.map((e) => {
              const on = analyzerEngine === e.value;
              return (
                <Pressable
                  key={e.value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
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
            {hasAnalyzeService
              ? '已接通分析服务。选 Qwen/Auto 后自拍将走 qwen3-vl-plus；未通过检查时会提示重试，不会改用示例冒充。'
              : '真实分析尚未配置，可以先查看示例报告。配置分析 API 或本地 Key 后重启。'}
          </Text>
        </AccordionSection>

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
        <View style={{ height: 12 }} />
        <SecondaryButton
          label="先看一份示例报告"
          onPress={() => {
            viewDemo();
            navigation.navigate('FreeResult');
          }}
        />
        <DisclaimerFooter text={DISCLAIMER} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
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
    backgroundColor: colors.border,
  },
  dotActive: { backgroundColor: colors.primary },
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
    backgroundColor: '#E8EDDF',
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
