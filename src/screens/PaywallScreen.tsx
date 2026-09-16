import React from 'react';
import { View, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useSession } from '../context/SessionContext';
import { PrimaryButton, SecondaryButton } from '../components/ui';
import { ReportPage, s } from '../components/report';
type Props = NativeStackScreenProps<RootStackParamList, 'Paywall'>;
export function PaywallScreen({ navigation }: Props) {
  const { unlock, result } = useSession();
  if (!result || result.analysis_status !== 'complete')
    return (
      <ReportPage label="完整报告">
        <Text style={s.title}>先完成本次分析</Text>
        <SecondaryButton
          label="返回结果"
          onPress={() => navigation.navigate('FreeResult')}
        />
      </ReportPage>
    );
  return (
    <ReportPage label="完整报告">
      <Text style={s.eyebrow}>让每一步都有理由</Text>
      <Text style={[s.title, { marginVertical: 16 }]}>
        知道皮肤需要什么，{`\n`}也知道什么不用加。
      </Text>
      <Text style={s.body}>展开本次分析的具体护理安排。</Text>
      <View style={[s.card, { marginVertical: 28 }]}>
        {[
          '7 项结果的具体说明',
          '未来 14 天的早晚护理安排',
          '洁面、爽肤水、精华、保湿乳、面霜、防晒的取舍',
          '产品名称、成分、推荐理由和使用注意',
        ].map((x, i) => (
          <View key={x} style={{ flexDirection: 'row', gap: 14, marginBottom: 20 }}>
            <Text style={s.eyebrow}>{String(i + 1).padStart(2, '0')}</Text>
            <Text style={[s.body, { flex: 1 }]}>{x}</Text>
          </View>
        ))}
      </View>
      <Text style={[s.small, { marginBottom: 16 }]}>
        当前为功能预览，未接入真实支付。本次查看不会扣款。
      </Text>
      <PrimaryButton
        label="预览完整护理方案"
        onPress={() => {
          unlock();
          navigation.replace('PaidReport');
        }}
      />
      <View style={{ height: 12 }} />
      <SecondaryButton label="返回皮肤结果" onPress={() => navigation.goBack()} />
    </ReportPage>
  );
}
