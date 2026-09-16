# Averie Skin v3

在 5d0fde8 对应交接包上重写的皮肤外观报告、护理规则和界面。Expo 57 / React Native / TypeScript。

## 运行

使用 Node.js 22.13 或以上（本次构建使用 Node 24）。解压后进入本文件所在目录：

```sh
npm ci
npm run web
```

首页点击“先看一份示例报告”即可查看新版，不需要 Key 或上传照片。

本地测试真实 Qwen 时，自行复制 `.env.example` 为 `.env` 并填写开发 Key。然后运行 `npx expo start -c`，在“分析设置”选择 Qwen。不要把 Key 发到聊天或提交代码。`EXPO_PUBLIC_*` 和通过 app.config 注入的 extra 都会进入客户端；生产版本必须改用后端代理。

原生端运行 `npx expo start -c`，使用兼容 SDK 57 的开发环境。本次没有完成 iOS/Android 真机验收，不把 Web 通过等同于原生摄像头与权限通过。

## 验证与合同导出

```sh
npm run typecheck
npm test
npm run export:contracts
npx expo export --platform web --output-dir web-build
```

`npm test` 覆盖评分、字段缺失、低质量图片、用户偏好、未成年与地区产品过滤、精华暂缓、保湿不重复叠加以及两份 Schema。`export:contracts` 会从实际源码重新生成 docs 内的 JSON、提示词和完整中文示例。

## 交付文件

- `docs/框架与中文文案规范.md`：竞品/社区来源、信息架构、评分、文案规则、六类产品取舍和工程边界。
- `docs/llm-output.schema.json`：模型只返回观察的合同。
- `docs/report-output.schema.json`：免费与完整报告对象的字段合同。
- `docs/完整示例报告.md`、`docs/example-report.json`：28 岁女性、混合偏油场景的完整报告。
- `docs/example-observations.json`：该报告对应的模型观察样本。
- `docs/product-catalog.json`：核对过的型号、成分角色、来源与日期。
- `docs/model-prompt.txt`：当前模型系统提示词。

## 主要代码

| 文件 | 职责 |
|---|---|
| `src/lib/llmSchema.ts` | 模型合同与提示词 |
| `src/lib/reportValidation.ts` | 拒绝格式错误、缺项和部分不合规输出 |
| `src/lib/mapLlmToResult.ts` | 观察转换为展示分、顺序、结果 |
| `src/lib/carePlan.ts` | 六类产品取舍与十四天安排 |
| `src/lib/productCatalog.ts` | 已核对的产品事实，禁止模型补配方 |
| `src/lib/reportSchema.ts` | 完整应用报告合同 |
| `src/components/report.tsx` | 报告、分项、产品卡组件 |
| `src/screens/FreeResultScreen.tsx` | 免费结果 |
| `src/screens/PaidReportScreen.tsx` | 默认折叠的完整报告 |

真实分析失败时不会自动变成 Mock。示例固定且显式标注。年龄和性别不改变分数。评分是产品呈现规则，没有临床测量含义。

当前产品目录是中国地区的有限初始集合，防晒型号资料尚未齐全，因此防晒步骤保留而具体候选暂缺；海外目录与真实海外引擎未接入。付款页是功能预览，没有扣款，也没有服务端付费鉴权。

安装时 npm 报告 13 个 moderate 依赖审计项；未执行可能破坏 Expo 兼容性的 `audit fix --force`。正式发布前应单独处理依赖审计与原生平台验收。

外观评估与护肤参考，不能替代医疗建议。
