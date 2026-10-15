# Issue #27：OpenCode 开发记录

16 October 2026。#26 合并（`f829c6c`）后，从 `main` 建立 `fix/27-storage-and-screen-titles`。负责人：Rae（Rae404）。

## OpenCode

- 模型 `openai/gpt-6-luna`。
- Session：`ses_ebe1ed8e2ffeDRiyjhLTSleTkt`，标题 "A3 Issue 27 - storage and screen titles"。三轮在同一 session 内完成。
- OpenCode 不执行 git 操作；每轮结束、审查和测试后再提交。

## 三轮开发

1. **存储不可用时正常启动**。提示词给出复现方式（`addInitScript` 让 `localStorage` getter 抛出 `SecurityError`）、
   原因（`reopenStoredReceipt()` 用同一个 catch 处理"无法读取"与"数据无效"）和要求的行为。
   OpenCode 把访问 `localStorage` 失败与数据校验失败分开，新增 `#storage-unavailable` 提示，
   并新建 `app/tests/issue-27.mjs`（3 个测试）。149/149 通过。提交 `908f99d`（fix）、`b8ceb41`（test）。
2. **补齐两处遗漏**：`getItem` 抛错也按存储不可用处理；存储不可用时，未保存提示说明本浏览器无法保存回执，
   Confirm reset 清除会话和 key，并如实说明没有读到或删除任何回执。新增 2 个测试，151/151 通过。
   提交 `6812b4e`（fix）、`8ded93b`（test）。
3. **每个页面的标题**。要求用一个机制而非逐处修改：OpenCode 在三个页面的 `hidden` 属性上加一个
   `MutationObserver`，按可见页面同步 `<h1>` 与 `document.title`，不改变焦点。新增 2 个测试，
   并在损坏数据测试中断言恢复页标题。153/153 通过。提交 `1d70753`（fix）、`9e64c9c`（test）。

## 运行与测试

每轮 OpenCode 在端口 6811 运行完整测试；各提交另行在独立 worktree 中重跑。最终 **153/153 PASS**，
见[测试输出](../validation/issue-27-browser-test-results.txt)与[验收矩阵](../validation/issue-27-acceptance.md)。
未调用 SAP，未使用真实 key。
