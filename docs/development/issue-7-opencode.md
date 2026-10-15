# Issue #7：OpenCode 开发记录

15 October 2026。#20 合并（`e3c18a5`）后，从最新 `main` 建立 `issue-7-intent-receipt` 分支。负责人：Rae（Rae404）。

## OpenCode 环境

- OpenCode CLI 1.19.0（Homebrew 安装），模型 `openai/gpt-6.1-sol`，通过 ChatGPT 账号登录。
- 实际 session：`ses_ec17307f1ffeDFqpzIXjPnwsQC`，标题 "A3 Issue 7 - intent receipt"。三轮都在同一个 session 内完成。
- 应用代码和测试由 OpenCode 生成。OpenCode 在每轮中不执行 git 操作；提交在审查与独立测试之后进行。

## 三轮开发

1. **首轮实现**：任务说明包含 #7 全部验收条件、父 issue #4 的 AC02/AC15–AC22 规则，以及现有代码的约束
   （只用 `localStorage` 一个 key、静态服务只开放三个文件、原有 34 个测试必须通过、Disconnect 不删除回执）。
   OpenCode 新增 Screen 3、回执写入/回读校验、重试、刷新后重开、损坏数据恢复、两步重置，以及 17 个浏览器测试。51/51 通过。
2. **审查修复**：
   - 已有回执时审阅另一份单据，Screen 3 原本直接显示旧回执且无说明 → 现在明确写出旧单据号、当前单据“NOT been recorded”，
     需 Reset 才能记录新意向；新增 Return to list。
   - “Correct evidence” 按钮改名为 “Back to cost evidence”。
   - Evidence flags 不再向用户显示原始 JSON。
   - 新增不同单据场景测试和 Screen 3 桌面/手机布局测试。53/53 通过。
3. **截图后界面修订**：回执 identity 改为可读的 `|` 分隔格式；无重大不一致时 Reasons 显示说明而非空白；
   金额标签改为 Net/Tax/Gross amount；Screen 3 标题随状态显示 “Saved receipt (historical)” 或 “Receipt could not be recovered”。53/53 通过。

## 独立验证

- 每轮结束后在 OpenCode 使用的端口之外另起端口重新运行 `npm test`；最终结果 **53/53 PASS**（34 个原有回归 + 19 个新测试），
  原始输出见 [issue-7-browser-test-results.txt](../validation/issue-7-browser-test-results.txt)。
- 桌面 1366px / 手机 390px：保存回执、刷新重开后无整页横向溢出，存储中只有一条回执 key。
- `node --check`、`git diff --check` 通过；`resources/` 与 #5/#6 证据文件未改动。
- 本轮没有真实 SAP 调用，没有使用真实 key。#8 分页/恢复、#9 键盘与状态整合、#10 live 演示仍待完成。

[逐条验收矩阵及截图](../validation/issue-7-acceptance.md)

## 审查

<!-- 待 Rae 审查 diff 与截图后填写 -->
