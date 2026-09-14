import React, { useState } from 'react';
import { View, StyleSheet, Text, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useSession } from '../context/SessionContext';
import {
  DisclaimerFooter,
  PrimaryButton,
  SecondaryButton,
  Screen,
  Subtitle,
  Title,
} from '../components/ui';
import { colors, DISCLAIMER } from '../theme/tiers';

type Props = NativeStackScreenProps<RootStackParamList, 'Selfie'>;

export function SelfieScreen({ navigation }: Props) {
  const { imageUri, setImageUri, runAnalysis, analyzerEngine } = useSession();
  const [uri, setUri] = useState<string | null>(imageUri);
  const [busy, setBusy] = useState(false);

  async function pick(fromCamera: boolean) {
    try {
      if (fromCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('需要相机权限', '请在系统设置中允许相机访问，或改用相册。');
          return;
        }
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('需要相册权限', '请在系统设置中允许相册访问。');
          return;
        }
      }

      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.85,
            allowsEditing: true,
            aspect: [3, 4],
            cameraType: ImagePicker.CameraType.front,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.85,
            allowsEditing: true,
            aspect: [3, 4],
          });

      if (!result.canceled && result.assets[0]?.uri) {
        setUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert('出错了', '无法打开相机/相册，请稍后重试。');
    }
  }

  async function onAnalyze() {
    if (!uri) return;
    setBusy(true);
    setImageUri(uri);
    try {
      const { notice } = await runAnalysis({ imageUri: uri });
      if (notice) {
        Alert.alert('分析提示', notice);
      }
      navigation.replace('FreeResult');
    } catch {
      Alert.alert('分析失败', '请稍后重试，或在首页改回 Mock 引擎。');
    } finally {
      setBusy(false);
    }
  }

  const engineHint =
    analyzerEngine === 'qwen'
      ? '当前：Qwen（百炼 qwen3-vl-plus）'
      : analyzerEngine === 'auto'
        ? '当前：Auto（有 Key 走 Qwen）'
        : '当前：Mock 演示';

  return (
    <Screen>
      <View style={styles.progress}>
        <View style={[styles.dot, styles.dotDone]} />
        <View style={[styles.dot, styles.dotDone]} />
        <View style={[styles.dot, styles.dotActive]} />
      </View>
      <Title>自拍测肤</Title>
      <Subtitle>
        请正对光线充足处自拍，或从相册选择正面照。仅使用性别、年龄与自拍，无需问卷。
      </Subtitle>
      <Text style={styles.engineHint}>{engineHint}</Text>

      <View style={styles.previewWrap}>
        {uri ? (
          <View style={styles.previewFrame}>
            <Image source={{ uri }} style={styles.preview} />
          </View>
        ) : (
          <View style={styles.placeholder}>
            <View style={styles.placeholderRing}>
              <Text style={styles.placeholderIcon}>◎</Text>
            </View>
            <Text style={styles.placeholderText}>尚未选择照片</Text>
            <Text style={styles.placeholderHint}>正面 · 自然光 · 无滤镜</Text>
          </View>
        )}
      </View>

      <View style={styles.row}>
        <View style={styles.half}>
          <SecondaryButton label="拍照" onPress={() => pick(true)} />
        </View>
        <View style={styles.half}>
          <SecondaryButton label="从相册选" onPress={() => pick(false)} />
        </View>
      </View>

      <View style={styles.spacer} />
      <PrimaryButton
        label={busy ? '分析中…' : '开始分析'}
        disabled={!uri}
        loading={busy}
        onPress={onAnalyze}
      />
      <DisclaimerFooter text={DISCLAIMER} />
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  engineHint: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 12,
  },
  previewWrap: {
    alignItems: 'center',
    marginBottom: 18,
  },
  previewFrame: {
    borderRadius: 28,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(232,160,176,0.35)',
    backgroundColor: 'rgba(232,160,176,0.06)',
  },
  preview: {
    width: 216,
    height: 276,
    borderRadius: 24,
    backgroundColor: colors.surface,
  },
  placeholder: {
    width: 222,
    height: 282,
    borderRadius: 28,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  placeholderRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(232,160,176,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  placeholderIcon: {
    fontSize: 28,
    color: colors.primary,
  },
  placeholderText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  placeholderHint: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 6,
    letterSpacing: 0.5,
  },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  spacer: { flex: 1, minHeight: 20 },
});
