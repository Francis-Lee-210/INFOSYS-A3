# Issue #5：OpenCode 开发与验收记录

本记录保存本次真实使用 OpenCode 的范围，不表示整个 A3 或课程提交完成。

- 用户先要求完成 Issue #5，随后明确要求派遣本机 OpenCode CLI，并授权取用 SAP sandbox key。
- 实际工具：`/opt/homebrew/bin/opencode`，版本 `v2.0.28`，使用已有配置；未新登录或切换模型账号。
- 发现阶段会话：`ses_ec2bf410effeH4xphz2h1gH6Sw`。检查首选官方 schema；其初稿的计数/输出路径错误已由主代理修正，官方 JSON 哈希复核通过。
- 实现与全部修复使用同一会话：`ses_ec2bbf3a6ffeSeT6OuqgdLlIeG`，标题 `A3 Issue 5 - implement billing reader`。
- OpenCode 生成 Node HTTP 层、读取适配器、页面、fixture、测试及字段契约初稿。主代理核对官方文件、审查实现、提供定点修复脚本，再交同一 OpenCode 会话执行；未把这些修复冒称为模型独立完成。
- 独立只读子代理两次核查 #5 验收边界和测试：发现原测试边界、来源/usable 校验和旧证据清除缺口；主代理验证原始代码后纳入修复。
- 测试还发现旧服务误用和重复启动。最终测试由同进程创建自己的 fixture HTTP server，端口冲突直接失败；最终 9/9 结果来自当前适配器。
- 真实 key 从已登录的 Francis Lee SAP Hub 会话取用，只在本地连接/HTTPS 请求内存中使用，未传给 OpenCode 或写入提示词、源码、截图、报告。
- OpenCode 会话保存在其正常本机项目/会话存储中，应保留至评分完成。可用 `opencode run --session ses_ec2bbf3a6ffeSeT6OuqgdLlIeG` 明确继续此会话，避免误接最近的其他会话。

## 首次实施与真实验收 — 15 October 2026

- 最初的确定性浏览器/HTTP 测试由 OpenCode 执行 **9/9 PASS**；主代理在另一隔离端口6725独立复跑 **9/9 PASS**。
- 主代理于15:12 NZDT通过实际 Chrome 页面连接 SAP：10/10 usable，list/detail 上游200，按key一致；可选明细1条，partial覆盖。见 [B0报告](../validation/issue-5-b0.md) 与 [脱敏JSON](../validation/issue-5-live-evidence.json)。
- [界面预览](../validation/issue-5-fixture-preview.png)为显式synthetic fixture，不是实际SAP数据截图。

## 合并前复审与修复 — 15 October 2026

Francis要求“审核 #5，有问题就修，没问题就 Merge”。主代理分别安排规范和需求只读审查，核对底层代码及定向复现后，将修复交回上述同一OpenCode会话；最后两项收尾使用主代理提供的定点脚本，由CLI执行。提交、PR维护和合并检查由主代理负责。

- **规范审核：** 原有item父key校验可被continuation分支跳过；切换/重新读取详情会留下旧的选中摘要。两项均已修复。
- **需求审核：** date/currency的数组等错误类型曾被强制转换为有效字段；错误类型或超长的可选party/account曾显示Available。必需字段现在拒绝错误类型，可选上下文保持Unknown。同一item归属缺口也已修复。
- **补充修复：** item continuation须匹配所选单据的精确sandbox路径；错误类型、错误目的地以及显式`false`、`0`、空字符串链接均标记rejected，不跟随。空项目加有效continuation仍标记partial。
- list/detail在等待摘要后重新检查请求token，避免断开或换源后旧结果恢复状态。缺Key的Connect在改变当前来源前返回错误。
- OpenCode最终在端口6745执行 **15/15 PASS**；主代理在端口6765独立复跑 **15/15 PASS**，8个JS/MJS文件语法检查及diff检查通过。
- 主代理把新增的延迟list摘要测试运行在修复前代码的临时副本中：基础fixture通过，旧代码在断开后恢复列表的断言失败，确认该回归能检测实际缺陷。等待使用明确的摘要闸门，不吞掉完成等待错误。
- 两份官方spec哈希不变；本轮没有重新使用真实Key或重跑SAP验收，原有真实B0证据保留。与本票无关的14份dirty/untracked文件保持不变。
- 本地复审通过不构成GitHub的正式Approve；提交及合并状态以[PR #18](https://github.com/Francis-Lee-210/INFOSYS-A3/pull/18)为准。

后续 Issue #6–#10 仍须各自实施；没有生成最终课程 ZIP、PowerPoint、录像或 Canvas 提交凭证。CLI 的本次真实使用也不替代独立的课程 MCP 教学任务。
