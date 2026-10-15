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

15 October 2026：Rae 审查了代码改动、桌面/手机截图与验收矩阵，确认提交 PR。

## PR #21 review follow-up — 15 October 2026

The earlier Rae development/review record above is preserved. This follow-up was performed in OpenCode by GPT-6.1 Sol (`openai/gpt-6.1-sol`), session `ses_ec13d22feffd4d4LYSG4lIUe6g`, in the isolated `INFOSYS-A3-receipt-review` worktree on the existing `issue-7-intent-receipt` branch. No subagents were used. No existing commits were rewritten; Issue #11 files and unrelated worktrees were not edited.

- Fetched PR #21 at `498e15d2fcfd22e26f50c99d3d864258c63da599`; it had not advanced. Read current #7 and parent #4 requirements. No applicable `AGENTS.md` was present.
- Reproduced the five findings before implementation changes: gated source-response provenance mismatch; lost partial/continuation/scope metadata after reload; deleted storage described as kept after a read-back exception; BODY focus after Enter; 103px key field at 1280px. The original 53 tests passed on this checkout. One initial success-gate expected-count typo was corrected and the targeted provenance failure reproduced again before fixing application code.
- Kept the existing receipt journey and idempotent write/read-back design. The badge now follows the active view while connection state remains independent. Receipt v2 adds only structured coverage and assessment scope; older v1 bytes stay untouched in unsupported-version recovery. Read-back uncertainty clears the cached Saved history rather than pretending deletion failed or was rolled back.
- Successful explicit confirmation/retry focuses the saved heading. The connection grid keeps a useful input/hint width and lets controls wrap. Visual review of the reset-uncertainty screenshot also identified and removed the misleading “choose an intention” recovery instruction.
- Added deterministic browser regressions using page-routed responses, injected transport and storage faults. Keyboard confirmation uses Tab/Space/Enter rather than scripted focus or mouse input. Existing schema assertions were expanded for v2, not relaxed. `CHROME_EXECUTABLE_PATH` supports installed Chrome; default Playwright Chromium behaviour is unchanged. `CAPTURE_RECEIPT_EVIDENCE=1` captures only the new review screenshots. `TEST_FILTER` is an optional local diagnostic substring filter (always retains the existing fixture-server setup test); the final run is unfiltered.
- Environment: macOS, Node v24.20.0, Playwright 1.62.1, installed Chrome 155.0.8059.40 in headless mode. Playwright was installed in OpenCode's approved temporary directory, outside the repository. No real SAP key or authenticated SAP call was used.
- Final unfiltered run: **71/71 PASS** (53 retained scenarios + 18 review regressions); all application/test JS/MJS `node --check` checks and `git diff --check` pass. Confirmation/historical/reset-failure screenshots and layouts at 1280px, 1366px and 390px were visually inspected. The original 53-test log and screenshots remain unchanged historical evidence; the new results are appended and the review screenshots use separate filenames.
- Implementation and regression tests committed as `3a9c2a2` (`fix: preserve receipt evidence and truthful recovery state`); validation documentation/screenshots are a separate follow-up commit. Push targets the existing shared branch, without force or history rewriting.

See the appended [acceptance follow-up](../validation/issue-7-acceptance.md#pr-21-review-validation--15-october-2026), appended [test output](../validation/issue-7-browser-test-results.txt) and new `issue-7-review-*.png` screenshots for validation. The original results/screenshots are historical evidence, not replaced. No completion of #8, #9, #10 or #11 is claimed.
