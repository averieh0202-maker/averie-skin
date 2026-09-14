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

## Averie 小白三步（接 Qwen）

1. **拉代码**：`git pull origin main`
2. **在项目根目录创建 `.env`（不要提交）**，写入这一行（把 Key 换成你自己的）：
   ```bash
   EXPO_PUBLIC_DASHSCOPE_API_KEY=你的百炼Key
   ```
   可选同时关掉强制 Mock：
   ```bash
   EXPO_PUBLIC_USE_MOCK=0
   EXPO_PUBLIC_ANALYZER_MARKET=cn
   ```
3. **重启 Expo**（改 `.env` 后必须重启）：`npx expo start`，首页选 **Qwen**（或 Auto），自拍后扫码用 Expo Go 测试。失败会弹友好提示并自动回退 Mock。

> ⚠️ `EXPO_PUBLIC_*` 仅供 **Expo Go 本地测试**。Key 会进客户端 JS bundle，**永远不要 commit `.env`**。正式上线必须改成 **后端代理**，不要把生产 Key 打进 App。

也可使用 `DASHSCOPE_API_KEY=`（经 `app.config.js` 注入 `extra`）；Expo Go 直连测试仍推荐 `EXPO_PUBLIC_DASHSCOPE_API_KEY`。

## 可点击流程

1. **性别**（女 / 男 / 不愿说明）+ **分析引擎开关**（Mock / Qwen / Auto）
2. **年龄**（13–99）
3. **自拍**（相机或相册）
4. **免费结果**：巨大肤质评分 0–100 + 段位徽章 + 肤质倾向
5. **单次付费解锁**（Stub 支付，演示用）
6. **完整付费报告**：七维详解、分区提示（额头/鼻子/眼周/脸颊/下颌·口周）、14 天步骤、产品

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
└── SessionProvider
    └── RootNavigator
        ├── GenderScreen      # Mock / Qwen / Auto 开关
        ├── AgeScreen
        ├── SelfieScreen      # 异步分析 + 失败提示
        ├── FreeResultScreen
        ├── PaywallScreen
        └── PaidReportScreen  # 总览/分项/分区/计划/产品/注意
```

| 路径 | 职责 |
|------|------|
| `src/types/analysis.ts` | Schema v1.4（含 periocular 眼周） |
| `src/lib/mockAnalyzer.ts` | 本地 Mock（默认） |
| `src/lib/zoneTips.ts` | 多分区 zone_tips（防脸颊-only） |
| `src/lib/analyze.ts` | 路由：Mock ↔ Qwen |
| `src/lib/qwenAnalyzer.ts` | 百炼 `qwen3-vl-plus` 视觉调用 |
| `src/lib/mapLlmToResult.ts` | LLM JSON → 七维/倾向/分区/付费结构 |
| `src/lib/config.ts` | `expo-constants` 读取 env |
| `app.config.js` | 把 `.env` 注入 `extra` |
| `.env.example` | Key 变量名模板（无真实密钥） |

### 环境变量（精确名称）

| 变量 | 作用 |
|------|------|
| `EXPO_PUBLIC_USE_MOCK` | `1` 默认 Mock；`0` 有 Key 时倾向 Qwen |
| `EXPO_PUBLIC_ANALYZER_MARKET` | `cn` \| `overseas` |
| `EXPO_PUBLIC_DASHSCOPE_API_KEY` | 百炼 Key（Expo Go 测试用） |
| `DASHSCOPE_API_KEY` | 同上（经 app.config 注入） |

**切勿提交** `.env` / `.env.local`（已在 `.gitignore`）。Averie 自行把 Key 贴进本地 `.env`，不要把 Key 发到聊天。

### 模型路由

| 市场 | 主模型 | 失败 |
|------|--------|------|
| 中国 | **qwen3-vl-plus**（DashScope 兼容模式） | 友好提示 + **Mock** |
| 海外 | 预留 gemini / gpt | 暂用 Mock |

输出对齐：七维 + 倾向 + report sections（overview / details / zone_tips / plan / products / notes）。

### 付费规则（代码层）

- `runAnalysis()` 每次将 `unlocked` 重置为 `false`
- 免费 / 付费结果页**不提供「再测一次」按钮**
- 「结束并回到首页」会 `resetSession()`；再次分析需重新付费

## 免责声明

外观肤况评估与护肤参考，不能替代医疗建议。非医疗诊断，无任何效果承诺。

## License

见仓库 `LICENSE`。
