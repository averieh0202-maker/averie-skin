import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { CareGoal, CarePreferences } from '../types/analysis';
import { AccordionSection } from './ui';
import { colors } from '../theme/tiers';
const goals: [CareGoal, string][] = [
  ['oiliness', '出油'],
  ['pores', '毛孔'],
  ['dryness', '干燥'],
  ['tone', '肤色不均'],
  ['fine_lines', '细纹'],
  ['simple', '精简护肤'],
];
export function CarePreferencesForm({
  value,
  onChange,
}: {
  value: CarePreferences;
  onChange: (v: CarePreferences) => void;
}) {
  return (
    <AccordionSection
      title="让建议更适合你"
      lead="选填。照片看不出使用感受，补充后可调整产品取舍。"
    >
      <Text style={s.label}>最在意什么？最多选两项</Text>
      <View style={s.wrap}>
        {goals.map(([key, label]) => (
          <Pressable
            key={key}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: value.goals.includes(key) }}
            style={[s.chip, value.goals.includes(key) && s.selected]}
            onPress={() =>
              onChange({
                ...value,
                goals: value.goals.includes(key)
                  ? value.goals.filter((g) => g !== key)
                  : value.goals.length < 2
                    ? [...value.goals, key]
                    : value.goals,
              })
            }
          >
            <Text style={s.text}>{label}</Text>
          </Pressable>
        ))}
      </View>
      {(['tightness', 'discomfort'] as const).map((key) => (
        <View key={key}>
          <Text style={s.label}>
            {key === 'tightness'
              ? '洗完脸会觉得干、发紧吗？'
              : '最近涂护肤品会刺痛或发痒吗？'}
          </Text>
          <View style={s.wrap}>
            {(
              [
                ['yes', '会'],
                ['no', '不会'],
                ['unknown', '不确定'],
              ] as const
            ).map(([k, label]) => (
              <Pressable
                key={k}
                accessibilityRole="radio"
                accessibilityState={{ checked: value[key] === k }}
                style={[s.chip, value[key] === k && s.selected]}
                onPress={() => onChange({ ...value, [key]: k })}
              >
                <Text style={s.text}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </AccordionSection>
  );
}
const s = StyleSheet.create({
  label: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.text,
    marginBottom: 12,
    marginTop: 10,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selected: { backgroundColor: '#E8EDDF', borderColor: '#70816A' },
  text: { fontSize: 14, color: colors.text },
});
