import React, { useState } from 'react';
import {
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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

const AGE_ACCESSORY_ID = 'averie-age-input-accessory';

export function AgeScreen({ navigation }: Props) {
  const { age, setAge } = useSession();
  const [text, setText] = useState(age != null ? String(age) : '');
  const parsed = parseInt(text, 10);
  const valid = !Number.isNaN(parsed) && parsed >= 13 && parsed <= 99;

  const goNext = () => {
    if (!valid) {
      Keyboard.dismiss();
      return;
    }
    Keyboard.dismiss();
    setAge(parsed);
    navigation.navigate('Selfie');
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <Pressable style={styles.flexGrow} onPress={Keyboard.dismiss}>
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
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={() => Keyboard.dismiss()}
              inputAccessoryViewID={
                Platform.OS === 'ios' ? AGE_ACCESSORY_ID : undefined
              }
            />
            {!valid && text.length > 0 ? (
              <Text style={styles.hint}>请输入 13–99 之间的整数</Text>
            ) : (
              <Text style={styles.hint}> </Text>
            )}

            <View style={styles.spacer} />
            <PrimaryButton label="下一步" disabled={!valid} onPress={goNext} />
            <DisclaimerFooter text={DISCLAIMER} />
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {Platform.OS === 'ios' ? (
        <InputAccessoryView nativeID={AGE_ACCESSORY_ID}>
          <View style={styles.accessory}>
            <Pressable
              onPress={() => Keyboard.dismiss()}
              style={({ pressed }) => [
                styles.accessoryBtn,
                pressed && styles.accessoryBtnPressed,
              ]}
            >
              <Text style={styles.accessoryBtnText}>完成</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexGrow: { flexGrow: 1 },
  scrollContent: {
    flexGrow: 1,
  },
  progress: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 28,
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
  spacer: { flexGrow: 1, minHeight: 28 },
  accessory: {
    backgroundColor: '#1A1A1E',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'flex-end',
  },
  accessoryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  accessoryBtnPressed: { opacity: 0.85 },
  accessoryBtnText: {
    color: '#F4F4F6',
    fontWeight: '600',
    fontSize: 15,
  },
});
