# Averie Skin

中文（zh-Hans）皮肤外观分析 MVP。Expo + React Native + TypeScript。iOS 优先。

> 外观肤况评估与护肤参考，不能替代医疗建议。非医疗诊断，**无任何效果承诺**。

## 快速开始

```bash
git clone https://github.com/averieh0202-maker/averie-skin.git
cd averie-skin
npm install
npx expo start
```

然后用 Expo Go（iOS）扫码，或按 `i` / `w` 打开模拟器 / Web。

## 可点击流程

1. **性别**（女 / 男 / 不愿说明）
2. **年龄**（13–99）
3. **自拍**（相机或相册）
4. **免费结果**：巨大肤质评分 0–100 + 段位徽章 + 肤质倾向；把握仅页脚小字
5. **单次付费解锁**（Stub 支付，演示用）
6. **完整付费报告**：分项分、关注点与分区白话、14 天早晚步骤、产品「名称 + 型号」

**无护肤问卷。** 结果页**无复测入口**；重新走流程 = 再次付费。

## 段位视觉

| 分数 | 段位 | 视觉 |
|------|------|------|
| 0–39 | 待焕新 | 低饱和柔雾 |
| 40–59 | 修护期 | 淡色光晕 |
| 60–74 | 稳定光 | 干净白光 |
| 75–89 | 透亮 | 水光折射 |
| 90–100 | 瓷感 | 玻璃高光 / 稀有边框 |

## 架构

```
App.tsx
└── SessionProvider          # 性别 / 年龄 / 自拍 / 结果 / 解锁状态
    └── RootNavigator        # React Navigation native stack
        ├── GenderScreen
        ├── AgeScreen
        ├── SelfieScreen     # expo-image-picker
        ├── FreeResultScreen # 可分享主视觉
        ├── PaywallScreen    # Stub 单次支付
        └── PaidReportScreen # 完整报告（无外链）
```

| 路径 | 职责 |
|------|------|
| `src/types/analysis.ts` | Schema v1.2 类型 |
| `src/lib/mockAnalyzer.ts` | 本地 Mock 引擎（按 gender/age/uri 种子出分） |
| `src/theme/tiers.ts` | 段位视觉与免责声明 |
| `src/context/SessionContext.tsx` | 会话状态；`unlock` 仅对本分析一次 |
| `src/screens/*` | 各步 UI |
| `src/navigation/*` | 路由 |

### 付费规则（代码层）

- `runAnalysis()` 每次将 `unlocked` 重置为 `false`
- 免费 / 付费结果页**不提供「再测一次」按钮**
- 「结束并回到首页」会 `resetSession()`；再次分析需重新付费

### 产品展示规则

- 付费产品区只显示 **名称 + 型号** + 简短理由
- **无**外链、购买按钮、佣金话术

## Mock → 真实 LLM 接入点

当前：`src/lib/mockAnalyzer.ts` 的 `analyzeSkin()`。

未来替换为区域路由（同一套 Schema）：

| 市场 | 主模型 | 备援 | 约每次成本（CNY） |
|------|--------|------|-------------------|
| 中国 | **qwen3-vl-plus** | deepseek-flash | ≈¥0.01 / ≈¥0.006 |
| 海外 | **gemini-2.5-flash** | gpt-4o-mini | ≈¥0.02 / 视图片 token |

建议接入形状：

```ts
// src/lib/analyze.ts（未来）
export async function analyzeSkin(input: AnalysisInput, market: 'cn' | 'overseas') {
  if (__DEV__ && process.env.EXPO_PUBLIC_USE_MOCK !== '0') {
    return mockAnalyze(input); // 现有 mockAnalyzer
  }
  const route = market === 'cn'
    ? { primary: 'qwen3-vl-plus', fallback: 'deepseek-flash' }
    : { primary: 'gemini-2.5-flash', fallback: 'gpt-4o-mini' };
  // 调用后端；校验 JSON 符合 schema_version 1.2
  // Perfect Corp 不在范围内
}
```

后端应：

1. 收图 + gender + age（仅此三项输入）
2. 按市场选模型，失败切备援
3. 强制输出合法 JSON + 段位与分数一致
4. 过滤效果承诺句式；产品字段不得含 URL

## 免责声明

外观肤况评估与护肤参考，不能替代医疗建议。非医疗诊断，无任何效果承诺。

## License

见仓库 `LICENSE`。
