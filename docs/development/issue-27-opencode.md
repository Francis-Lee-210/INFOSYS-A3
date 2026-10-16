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

## 当前修复（OpenCode，PR #29 复审，head c0f9a515）

工作树：`.worktrees/INFOSYS-A3-review29`。只动 `app/app.mjs`、`app/tests/issue-27.mjs`，并在本文追加当前修复段；未做 git 提交/推送/分支变更，未触 SAP/key/配置。

OpenCode 复现了两个独立的 P2 缺陷（`/private/tmp/a3-pr29-storage-repro.mjs`，四个缺陷布尔量全为 true，且“已确认重置必须真正移除回执”断言失败）：

1. `storageUnavailable` 在启动 getItem/属性失败后被锁定为 true、永不清除。一次性启动读失败、存储恢复后，应能成功 Later/保存/读回；但原有的确认重置走早期返回、不移除存储；重置会复活回执。不可用提示也错误地保留。
2. 未知已有数据可能被覆盖。启动 getItem 可抛一次而已有有效/不受支持/损坏回执存在时，saveReceipt 的 setItem 会在任何恢复读之前把它覆盖；持续 getItem 失败但 setItem 可用时，也会写入字节并标记为 Unsaved。既有规则应保留历史/不受支持/损坏字节直到有意重置；一次一张回执。

### app/app.mjs 变更

- 新增 `currentStoredReceipt()`：安全快照当前 localStorage 可读性与回执字节，只在存储对象本身或 getItem 抛出时返回 `available: false`，不锁定陈旧标志。
- `reopenStoredReceipt()`：改用 `currentStoredReceipt()`；存储可读时清除 `storageUnavailable` 与 `#storage-unavailable` 陈旧提示，不再永久锁定。
- `saveReceipt()`：写入前安全重读当前存储。若仍不可读，不调用 setItem，保留诚实提示并可重试；若空且可读，清除陈旧标志/提示后执行正常写+读回+字节相等校验（保留已有重试精确等价语义）；若启动不可读期间存在未知已有字节且尚未尝试过待写入（`pendingWriteAttempted`），保留原字节，不覆盖，按原有有效历史或损坏/版本/来源恢复路由。
- 待选择意图变更时重置 `pendingWriteAttempted=false`。
- 确认重置：改为基于当前证据而非陈旧启动标志。存储对象 wholly 不可访问且无已知回执时，清会话/key 并给出诚实的“读或删失败”提示；有已知回执/恢复时走既有不确定重置+重试路径；存储对象可访问时始终尝试 `removeItem` 并校验结果；验证通过的重置清除陈旧 `storageUnavailable`/提示。保留既有删除/校验失败的不确定/保留状态。

### app/tests/issue-27.mjs 变更

新增/调整回归测试（全部黑箱，无公共私有助手契约）：

- 一次性启动读失败 -> 空存储恢复 -> 保存成功 -> 提示消失 -> 取消/确认重置 -> 重置后无回执。
- 一次性启动读失败且存在预先有效回执 -> 新 Confirm 保留原始字节/身份，不覆盖。
- 一次性启动读失败且存在损坏/不受支持字节 -> 重置前不变， deliberate 重置后清除（替代仅覆盖原有字节的旧测试）。
- 持续读失败、可写 setItem -> Confirm/Retry 不写入（计数调用）。
- 已知保存回执，重置首次 getItem 抛，随后可写 remove/读回清空回执；且清除陈旧不可用提示。
- 恢复存储、未保存前重置 -> 清除陈旧不可用标志/提示。
- 读回为语法合法但不同意图（来自真实 setItem 写入故障，而非手工构造架构）时，Retry 不会把它当作用户确认意图采纳；保留原始 Later，两次写入字节相等。
- 已知回执在属性拒绝下保留不确定重置与重试路径，恢复后可验证清空。

父方提供的最终复审补丁（`/private/tmp/a3-pr29-apply-final-review.py`）已按原样应用：修复“恢复存储重置前清除陈旧提示”测试中的 sessionStorage/getItem 递归；以真实 fixture 写入故障（含中间不可读的 Retry）替代手工构造的错误意图读回测试；新增已知回执属性拒绝重置/恢复用例；确认重置属性拒绝分支同时保护 `receiptRecovery`。

### 验证结果（实际）

- `node --check app.mjs` / `node --check tests/issue-27.mjs`：通过。
- `TEST_FILTER='issue 27' PORT=7500`：共 16 个检查（15 个 issue-27 组，即 7 个原有 + 8 个新增，加 1 个继承的 fixture 来源检查），无 regressions。
- 两份父方独立复现脚本：`a3-pr29-storage-repro.mjs` 与 `a3-pr29-pending-retry-repro.mjs` 均 exit 0，四缺陷布尔量均已修正。
- `git diff --check`：干净。
- 未声称 SAP/线上或父方完整未过滤验收结果；父方拥有最终完整未过滤验收与全部 Git 操作。

## 当前微修（OpenCode，PR #29 复审后，frozen a8de84c）

父方 Spec 审查发现一处窄路径：成功 setItem 后读回失败，字节可能已持久化，属性拒绝重置时仍应走不确定重置/重试路径而非直接判定。按原样应用父方补丁 `/private/tmp/a3-pr29-apply-partial-reset.py`，仅改两处：

1. `app/app.mjs`：在属性拒绝重置的保护条件中追加 `(pendingReceipt && pendingWriteAttempted)`，即 `if (receipt || receiptRecovery || (pendingReceipt && pendingWriteAttempted))`，注释改为“已知、无效或可能已由待写入持久化的回执”。不改动其他实现细节。
2. `app/tests/issue-27.mjs`：将既有“已知回执属性拒绝”测试改为对 `partialWrite` 的 false/true 两种变体循环；组数不变，无无关新增测试。无写入的永久启动拒绝行为不变。

### 验证结果（实际，聚焦）

- `node --check app.mjs` / `node --check tests/issue-27.mjs`：通过。
- `git diff --check`：干净。
- 父方部分写入重置复现 `/private/tmp/a3-pr29-partial-write-reset-repro.mjs`：`{"partialWriteWasUnsaved":true,"persistedBytesStillPresent":true,"uncertainResetRetryPreserved":true}`，全部为 true（即 exit 0）。
- `TEST_FILTER='issue 27' PORT=7500`：共 16 个检查全部通过，即 15 个 issue-27 组（7 原有 + 8 新增）加 1 个继承的 fixture 来源检查，**非 16 个 issue-27 组**。

全量父方未过滤验收与新提交冻结由父方独立完成；本处不声称全量结果为最终。

## 当前修复（OpenCode，PR #32 复审，HEAD `ee51431`）

本 session：`ses_ebc03cd83ffesb3EreZKTOskCE`。父方提供的 PR #32 补丁
`/private/tmp/a3-pr32-apply-reviewed-repair.py` 已按原样应用（基线 `ee51431`）；OpenCode 不执行任何
git 操作。本工作树仅 `app/app.mjs`、`app/tests/issue-27.mjs` 两处，并在本文追加本节。

### app/app.mjs 变更

- 在确认重置分支读回仍有字节且尚无有效回执时，保留已知数据的存在：未尝试过写入时，
  验证并恢复原有历史回执或保留损坏数据恢复路径；本会话尝试过写入时，保留恢复与不确定
  重置状态，不把自身未验证的写入提升为 `Saved`。后续无法验证删除时仍可重试。
- 纯插入式变更，其余实现与既有重试语义保持不变。

### app/tests/issue-27.mjs 变更

在既有测试之后追加三个黑盒回归组：

- 失败重置后保留有效/损坏既有数据的存在，取消重置与再次确认路径不变，直至有意重置；
- 第二次读（持续 `getItem` 失败）或属性拒绝时保留不确定重置/重试路径，可恢复后验证清除；
- 本次会话自身的错误意图写入不会被采纳为 `Saved`。

### 验证结果（实际，聚焦）

- `node --check app.mjs` / `node --check tests/issue-27.mjs`：通过。
- `git diff --check`：干净。
- 父方复现 `/private/tmp/a3-pr32-reset-preserved-data-repro.mjs`：exit 0，
  两个变体均为 true（`oldBytesPreservedAfterFailedReset`、
  `oldBytesProtectedAfterNextConfirmation`、`oldBytesStillPresent`、
  `uncertainResetRetryPreserved`）。
- `TEST_FILTER='issue 27' PORT=8600 npm test`：22 个检查全部通过（21 个 issue-27 组加 1 个继承
  的 fixture 来源检查），exit 0。
- 未声称父方完整未过滤验收；父方拥有完整验收与全部 Git 操作。
