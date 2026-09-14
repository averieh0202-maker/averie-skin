import React from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useSession } from '../context/SessionContext';
import { PrimaryButton, SecondaryButton } from '../components/ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, DISCLAIMER, tierFromScore } from '../theme/tiers';

type Props = NativeStackScreenProps<RootStackParamList, 'FreeResult'>;

const { width } = Dimensions.get('window');

export function FreeResultScreen({ navigation }: Props) {
  const { result } = useSession();

  if (!result) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>暂无结果</Text>
        <SecondaryButton
          label="重新开始"
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Gender' }] })}
        />
      </View>
    );
  }

  const score = result.skin_score.value;
  const tier = tierFromScore(score);
  const confPct = Math.round(result.meta.overall_confidence * 100);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <LinearGradient
        colors={tier.gradient}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Soft glow orb for shareability */}
      <View
        style={[
          styles.glow,
          {
            opacity: tier.glowOpacity,
            backgroundColor: tier.accent,
          },
        ]}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.brand}>Averie Skin</Text>

        {/* Huge score — primary free UI */}
        <View style={styles.scoreBlock}>
          <Text style={[styles.score, { color: tier.scoreColor }]}>{score}</Text>
          <Text style={[styles.scoreLabel, { color: tier.badgeText }]}>肤质评分</Text>
        </View>

        {/* Tier badge — distinct per tier */}
        <View
          style={[
            styles.badge,
            {
              backgroundColor: tier.badgeBg,
              borderColor: tier.badgeBorder,
            },
            tier.id === 'porcelain' && styles.badgePorcelain,
            tier.id === 'glow' && styles.badgeGlow,
          ]}
        >
          <Text style={[styles.badgeText, { color: tier.badgeText }]}>
            {tier.name}
          </Text>
          <Text style={[styles.badgeSub, { color: tier.badgeText }]}>
            {tier.subtitle}
          </Text>
        </View>

        {/* Skin tendency */}
        <View
          style={[
            styles.tendencyCard,
            { backgroundColor: tier.cardBg, borderColor: tier.cardBorder },
          ]}
        >
          <Text style={styles.tendencyLabel}>肤质倾向</Text>
          <Text style={[styles.tendencyValue, { color: tier.scoreColor }]}>
            {result.skin_type.label_zh}
          </Text>
          <Text style={styles.headline}>{result.summary_free.headline}</Text>
        </View>

        <View style={styles.ctaBlock}>
          <PrimaryButton
            label="解锁完整报告 · ¥9.9"
            onPress={() => navigation.navigate('Paywall')}
          />
          <Text style={styles.ctaHint}>单次解锁 · 无订阅 · 无复测入口</Text>
        </View>

        {/* Confidence only as small footer — do NOT lead with severity */}
        <Text style={styles.confidence}>
          基于当前照片的外观判断，把握约 {confPct}% · 仅供参考
        </Text>
        <Text style={styles.disclaimer}>{DISCLAIMER}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  glow: {
    position: 'absolute',
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: width,
    top: -width * 0.15,
    alignSelf: 'center',
    left: width * 0.05,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 40,
    alignItems: 'center',
  },
  brand: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 28,
  },
  scoreBlock: { alignItems: 'center', marginBottom: 12 },
  score: {
    fontSize: 108,
    fontWeight: '800',
    letterSpacing: -4,
    lineHeight: 116,
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.75,
    marginTop: -4,
  },
  badge: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    marginBottom: 28,
    minWidth: 140,
  },
  badgePorcelain: {
    borderWidth: 2,
    shadowColor: '#FFE8C8',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  badgeGlow: {
    shadowColor: '#6EC8E8',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  badgeText: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
  },
  badgeSub: {
    fontSize: 11,
    opacity: 0.7,
    marginTop: 2,
  },
  tendencyCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 28,
  },
  tendencyLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 4,
  },
  tendencyValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  headline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 20,
  },
  ctaBlock: { width: '100%', marginBottom: 20 },
  ctaHint: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    marginTop: 10,
  },
  confidence: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginBottom: 8,
  },
  disclaimer: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    lineHeight: 15,
    paddingHorizontal: 8,
  },
  fallback: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  fallbackText: { color: colors.text, fontSize: 16 },
});
