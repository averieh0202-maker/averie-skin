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
import { PerceptionDimension } from '../types/analysis';
import { CTA_COPY } from '../lib/copyPack';

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
  const dimensions = result.perception_scores;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <LinearGradient
        colors={tier.gradient}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          styles.glow,
          {
            opacity: tier.glowOpacity,
            backgroundColor: tier.accent,
          },
        ]}
      />
      <View style={[styles.glowSoft, { backgroundColor: tier.scoreColor }]} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.brand}>Averie Skin</Text>

        {/* Hero: large score + tier */}
        <View style={styles.scoreBlock}>
          <Text style={[styles.scoreUnit, { color: tier.badgeText }]}>肤质评分</Text>
          <Text style={[styles.score, { color: tier.scoreColor }]}>{score}</Text>
          <View style={styles.scoreUnderline}>
            <View
              style={[styles.scoreUnderlineFill, { backgroundColor: tier.accent }]}
            />
          </View>
        </View>

        <View
          style={[
            styles.badge,
            {
              backgroundColor: tier.badgeBg,
              borderColor: tier.badgeBorder,
            },
            tier.id === 'porcelain' && styles.badgePorcelain,
            tier.id === 'glow' && styles.badgeGlow,
            tier.id === 'steady' && styles.badgeSteady,
          ]}
        >
          <Text style={[styles.badgeText, { color: tier.badgeText }]}>
            {tier.name}
          </Text>
          <Text style={[styles.badgeSub, { color: tier.badgeText }]}>
            {tier.subtitle}
          </Text>
        </View>

        {/* Skin tendency + free header: 优势 + 1–2 关注点 + neutral disclaimer */}
        <View
          style={[
            styles.tendencyCard,
            { backgroundColor: tier.cardBg, borderColor: tier.cardBorder },
          ]}
        >
          <Text style={styles.tendencyLabel}>肤质倾向</Text>
          <Text style={[styles.tendencyValue, { color: tier.scoreColor }]}>
            {result.skin_tendency}
          </Text>
          <Text style={styles.headline}>{result.summary_free.headline}</Text>
        </View>

        {/* 7 perception dimensions — exact names */}
        <View
          style={[
            styles.dimsCard,
            { backgroundColor: tier.cardBg, borderColor: tier.cardBorder },
          ]}
        >
          <Text style={styles.dimsTitle}>分项观感</Text>
          <Text style={styles.dimsHint}>外观感知 · 基于当前影像</Text>
          {dimensions.map((d) => (
            <DimensionRow key={d.key} dim={d} accent={tier.accent} />
          ))}
        </View>

        <View style={styles.ctaBlock}>
          <PrimaryButton
            label={CTA_COPY.primary}
            onPress={() => navigation.navigate('Paywall')}
          />
          <Text style={styles.ctaHint}>{CTA_COPY.secondary}</Text>
        </View>

        <Text style={styles.disclaimer}>{DISCLAIMER}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function DimensionRow({
  dim,
  accent,
}: {
  dim: PerceptionDimension;
  accent: string;
}) {
  return (
    <View style={styles.dimRow}>
      <View style={styles.dimHeader}>
        <View style={styles.dimLabelWrap}>
          <Text style={styles.dimLabel}>{dim.label_zh}</Text>
          {dim.status ? (
            <Text style={styles.dimStatus}>{dim.status}</Text>
          ) : null}
        </View>
        <Text style={[styles.dimValue, { color: accent }]}>{dim.value}</Text>
      </View>
      <View style={styles.dimTrack}>
        <View
          style={[
            styles.dimFill,
            {
              width: `${Math.max(4, Math.min(100, dim.value))}%`,
              backgroundColor: accent,
            },
          ]}
        />
      </View>
      <Text style={styles.dimObs}>{dim.observation}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  glow: {
    position: 'absolute',
    width: width * 0.95,
    height: width * 0.95,
    borderRadius: width,
    top: -width * 0.2,
    alignSelf: 'center',
    left: width * 0.025,
  },
  glowSoft: {
    position: 'absolute',
    width: width * 0.55,
    height: width * 0.55,
    borderRadius: width,
    top: width * 0.08,
    alignSelf: 'center',
    left: width * 0.225,
    opacity: 0.08,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 44,
    alignItems: 'center',
  },
  brand: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 32,
  },
  scoreBlock: { alignItems: 'center', marginBottom: 18 },
  scoreUnit: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
    opacity: 0.7,
    marginBottom: 4,
  },
  score: {
    fontSize: 120,
    fontWeight: '200',
    letterSpacing: -6,
    lineHeight: 128,
  },
  scoreUnderline: {
    width: 56,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginTop: 4,
    overflow: 'hidden',
  },
  scoreUnderlineFill: {
    width: '70%',
    height: '100%',
    borderRadius: 2,
    alignSelf: 'center',
  },
  badge: {
    paddingHorizontal: 26,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    marginBottom: 28,
    minWidth: 152,
  },
  badgePorcelain: {
    borderWidth: 2,
    shadowColor: '#FFE8C8',
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  badgeGlow: {
    shadowColor: '#6EC8E8',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  badgeSteady: {
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  badgeText: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 2,
  },
  badgeSub: {
    fontSize: 11,
    opacity: 0.65,
    marginTop: 3,
    letterSpacing: 0.5,
  },
  tendencyCard: {
    width: '100%',
    borderRadius: 22,
    borderWidth: 1,
    paddingVertical: 20,
    paddingHorizontal: 22,
    marginBottom: 14,
  },
  tendencyLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
    marginBottom: 6,
  },
  tendencyValue: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 26,
    marginBottom: 10,
  },
  headline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 21,
  },
  dimsCard: {
    width: '100%',
    borderRadius: 22,
    borderWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  dimsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.92)',
    marginBottom: 2,
  },
  dimsHint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.42)',
    marginBottom: 16,
  },
  dimRow: { marginBottom: 16 },
  dimHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  dimLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dimLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.78)',
    fontWeight: '500',
  },
  dimStatus: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '500',
  },
  dimValue: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  dimTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  dimFill: {
    height: '100%',
    borderRadius: 3,
    opacity: 0.9,
  },
  dimObs: {
    marginTop: 6,
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 17,
  },
  ctaBlock: { width: '100%', marginBottom: 20 },
  ctaHint: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.42)',
    fontSize: 12,
    marginTop: 12,
  },
  disclaimer: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.32)',
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
