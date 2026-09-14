import React, { useState } from 'react';
import { View, StyleSheet, Text, Alert } from 'react-native';
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

type Props = NativeStackScreenProps<RootStackParamList, 'Paywall'>;

const FEATURES = [
  '分项评分（光泽 / 匀净 / 澄净 / 屏障观感）',
  '关注点 + 分区白话说明',
  '14 天早晚护肤步骤',
  '产品名称 + 型号参考（无外链）',
];

export function PaywallScreen({ navigation }: Props) {
  const { unlock, result } = useSession();
  const [paying, setPaying] = useState(false);

  function stubPay() {
    setPaying(true);
    // Stub payment — unlocks this analysis only
    setTimeout(() => {
      unlock();
      setPaying(false);
      Alert.alert('支付成功', '已解锁本次完整报告（演示 Stub）', [
        {
          text: '查看报告',
          onPress: () => navigation.replace('PaidReport'),
        },
      ]);
    }, 800);
  }

  return (
    <Screen>
      <Title>解锁完整报告</Title>
      <Subtitle>
        单次付费解锁本次分析。再次测肤需重新付费；结果页不提供复测入口。
      </Subtitle>

      {result ? (
        <View style={styles.scoreChip}>
          <Text style={styles.scoreChipText}>
            本次评分 {result.skin_score.value} · {result.skin_score.tier_name}
          </Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.price}>¥9.9</Text>
        <Text style={styles.priceSub}>一次性 · 仅本次分析</Text>
        {FEATURES.map((f) => (
          <View key={f} style={styles.featureRow}>
            <Text style={styles.check}>✓</Text>
            <Text style={styles.feature}>{f}</Text>
          </View>
        ))}
      </View>

      <View style={styles.spacer} />
      <PrimaryButton
        label={paying ? '处理中…' : '立即解锁（Stub 支付）'}
        loading={paying}
        onPress={stubPay}
      />
      <View style={{ height: 10 }} />
      <SecondaryButton label="返回免费结果" onPress={() => navigation.goBack()} />
      <DisclaimerFooter text={DISCLAIMER} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scoreChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(232,160,176,0.15)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 18,
  },
  scoreChipText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },
  price: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -1,
  },
  priceSub: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 18,
    marginTop: 2,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  check: {
    color: colors.success,
    fontWeight: '700',
    marginRight: 10,
    fontSize: 14,
  },
  feature: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  spacer: { flex: 1 },
});
