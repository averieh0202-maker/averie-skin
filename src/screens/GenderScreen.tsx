import React, { useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useSession } from '../context/SessionContext';
import { Gender } from '../types/analysis';
import {
  OptionCard,
  PrimaryButton,
  Screen,
  Subtitle,
  Title,
  DisclaimerFooter,
} from '../components/ui';
import { DISCLAIMER } from '../theme/tiers';

type Props = NativeStackScreenProps<RootStackParamList, 'Gender'>;

const OPTIONS: Array<{ value: Gender; label: string; emoji: string }> = [
  { value: 'female', label: '女', emoji: '♀' },
  { value: 'male', label: '男', emoji: '♂' },
  { value: 'unspecified', label: '不愿说明', emoji: '·' },
];

export function GenderScreen({ navigation }: Props) {
  const { gender, setGender } = useSession();
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
  spacer: { flex: 1, minHeight: 24 },
});
