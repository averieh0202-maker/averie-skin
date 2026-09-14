import React, { useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useSession } from '../context/SessionContext';
import {
  DisclaimerFooter,
  PrimaryButton,
  Screen,
  SoftInput,
  Subtitle,
  Title,
} from '../components/ui';
import { colors, DISCLAIMER } from '../theme/tiers';

type Props = NativeStackScreenProps<RootStackParamList, 'Age'>;

export function AgeScreen({ navigation }: Props) {
  const { age, setAge } = useSession();
  const [text, setText] = useState(age != null ? String(age) : '');
  const parsed = parseInt(text, 10);
  const valid = !Number.isNaN(parsed) && parsed >= 13 && parsed <= 99;

  return (
    <Screen>
      <View style={styles.progress}>
        <View style={[styles.dot, styles.dotDone]} />
        <View style={[styles.dot, styles.dotActive]} />
        <View style={styles.dot} />
      </View>
      <Title>你的年龄</Title>
      <Subtitle>帮助引擎理解肤况先验，不会直接当作分数。</Subtitle>

      <SoftInput
        value={text}
        onChangeText={(t) => setText(t.replace(/[^0-9]/g, '').slice(0, 2))}
        keyboardType="number-pad"
        placeholder="例如 28"
        maxLength={2}
        autoFocus
      />
      {!valid && text.length > 0 ? (
        <Text style={styles.hint}>请输入 13–99 之间的整数</Text>
      ) : (
        <Text style={styles.hint}> </Text>
      )}

      <View style={styles.spacer} />
      <PrimaryButton
        label="下一步"
        disabled={!valid}
        onPress={() => {
          setAge(parsed);
          navigation.navigate('Selfie');
        }}
      />
      <DisclaimerFooter text={DISCLAIMER} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 24,
    marginTop: 8,
  },
  dot: {
    width: 28,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  dotActive: { backgroundColor: '#E8A0B0' },
  dotDone: { backgroundColor: 'rgba(232,160,176,0.45)' },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: 10 },
  spacer: { flex: 1 },
});
