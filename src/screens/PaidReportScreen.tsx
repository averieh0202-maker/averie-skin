import React from 'react';
import { View, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useSession } from '../context/SessionContext';
import { AccordionSection, SecondaryButton } from '../components/ui';
import {
  ReportPage,
  EngineNote,
  MetricRow,
  CandidateCard,
  s,
} from '../components/report';
import { DECISION_LABELS } from '../lib/copyPack';
import { colors } from '../theme/tiers';
type Props = NativeStackScreenProps<RootStackParamList, 'PaidReport'>;
export function PaidReportScreen({ navigation }: Props) {
  const { result, unlocked } = useSession();
  if (!result || !unlocked || result.analysis_status !== 'complete')
    return (
      <ReportPage label="护理方案">
        <Text style={s.title}>请先查看本次结果</Text>
        <SecondaryButton
          label="返回结果"
          onPress={() => navigation.navigate('FreeResult')}
        />
      </ReportPage>
    );
  const decisions = result.products_paid.decisions;
  return (
    <ReportPage label="我的护理方案">
      <EngineNote result={result} />
      <Text style={s.eyebrow}>从结果到日常</Text>
      <Text style={[s.title, { marginTop: 8 }]}>护肤有重点，{`\n`}步骤可以少一点。</Text>
      <Text style={[s.body, { marginTop: 12, marginBottom: 28 }]}>
        结合这次的皮肤表现，看看先做什么、哪些产品暂时不用加。
      </Text>
      <AccordionSection title="这次先做什么" defaultExpanded>
        <Text style={s.body}>{result.report_paid.full_summary}</Text>
        {result.summary_free.priorities.map((k) => {
          const d = result.perception_scores.find((x) => x.key === k)!;
          return (
            <View key={k} style={s.actionBox}>
              <Text style={s.action}>{d.action}</Text>
            </View>
          );
        })}
      </AccordionSection>
      <AccordionSection title="7 项结果说明" lead="看看每一项的具体表现和护理建议。">
        {result.perception_scores.map((d) => (
          <MetricRow key={d.key} dim={d} detail />
        ))}
      </AccordionSection>
      {result.report_paid.zone_notes.length ? (
        <AccordionSection title="不同部位怎么照顾">
          {result.report_paid.zone_notes.map((z) => (
            <View key={z.zone} style={{ marginBottom: 20 }}>
              <Text style={[s.subheading, { marginTop: 0 }]}>{z.zone_zh}</Text>
              <Text style={s.body}>{z.note}</Text>
            </View>
          ))}
        </AccordionSection>
      ) : null}
      <AccordionSection
        title="早晚怎么用"
        lead="未来 14 天先把基础护理做好，不需要一次换齐。"
      >
        {(['am', 'pm'] as const).map((time) => (
          <View key={time}>
            <Text style={[s.sectionTitle, { marginTop: 16 }]}>
              {time === 'am' ? '早晨' : '晚上'}
            </Text>
            {result.routine_paid[time].map((step) => (
              <View
                key={step.step}
                style={{ flexDirection: 'row', gap: 14, marginBottom: 20 }}
              >
                <Text style={[s.eyebrow, { marginTop: 3 }]}>
                  {String(step.step).padStart(2, '0')}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.metricTitle, { marginBottom: 6 }]}>{step.action}</Text>
                  <Text style={s.body}>{step.purpose}</Text>
                </View>
              </View>
            ))}
          </View>
        ))}
        <Text style={s.subheading}>慢慢建立节奏</Text>
        {result.routine_paid.phases.map((p) => (
          <View key={p.days} style={{ marginBottom: 20 }}>
            <Text style={s.eyebrow}>{p.days}</Text>
            <Text style={[s.metricTitle, { marginVertical: 6 }]}>{p.title}</Text>
            <Text style={s.body}>{p.instruction}</Text>
          </View>
        ))}
      </AccordionSection>
      <AccordionSection title="每一类产品，要不要加" lead={result.products_paid.note}>
        <View
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}
        >
          {decisions.map((d) => (
            <View
              key={d.category}
              style={{ padding: 9, backgroundColor: '#EDF0E8', borderRadius: 7 }}
            >
              <Text style={s.small}>
                {d.title} {DECISION_LABELS[d.status]}
              </Text>
            </View>
          ))}
        </View>
        {decisions.map((d) => (
          <View
            key={d.category}
            style={{ paddingVertical: 22, borderTopWidth: 1, borderColor: colors.border }}
          >
            <View style={s.between}>
              <Text style={s.sectionTitle}>{d.title}</Text>
              <Text
                style={[
                  s.status,
                  { color: d.status === 'hold' ? colors.danger : colors.primary },
                ]}
              >
                {DECISION_LABELS[d.status]}
              </Text>
            </View>
            <Text style={s.body}>{d.reason}</Text>
            <Text style={[s.small, { marginTop: 10 }]}>{d.selection_note}</Text>
            {d.candidates.map((p, i) => (
              <CandidateCard key={p.id} item={p} index={i} />
            ))}
          </View>
        ))}
      </AccordionSection>
      <AccordionSection title="使用前留意">
        {result.routine_paid.avoid.map((t) => (
          <Text key={t} style={[s.body, { marginBottom: 16 }]}>
            {t}
          </Text>
        ))}
        <Text style={s.body}>
          未了解你的既往不耐受、孕哺状态和全部在用产品，不据此确认某个配方适合所有情况。已有相关顾虑时先核对标签并咨询专业人士。
        </Text>
      </AccordionSection>
      <View style={{ marginTop: 16 }}>
        <SecondaryButton
          label="返回皮肤结果"
          onPress={() => navigation.navigate('FreeResult')}
        />
      </View>
      <Text style={[s.small, { marginTop: 24 }]}>{result.disclaimer}</Text>
    </ReportPage>
  );
}
