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

## 实际验证

- 全部 JS/MJS 语法检查通过。
- OpenCode 在独立测试端口执行 `npm test`：最终 **9/9 PASS**。
- 公开浏览器入口覆盖 raw OData→归一化→选中详情、空/不可用/错误契约、key 一致/不一致、精度/日期/币种、凭证生命周期、来源/旧证据拒绝；HTTP 层补充重定向、危险路径和 continuation 检查。
- 主代理在另一隔离端口6725独立复跑最终测试：**9/9 PASS**；文件语法、官方spec哈希、脱敏证据一致性检查通过。
- 主代理通过实际 Chrome 页面连接 SAP：10/10 usable，list/detail 上游 200，按 key 一致；可选明细 1 条，partial 覆盖。见 [B0 报告](../validation/issue-5-b0.md) 与 [脱敏 JSON](../validation/issue-5-live-evidence.json)。
- [界面预览](../validation/issue-5-fixture-preview.png)为显式 synthetic fixture；不是实际 SAP 数据截图。

后续 Issue #6–#10 仍须各自实施；没有生成最终课程 ZIP、PowerPoint、录像或 Canvas 提交凭证。CLI 的本次真实使用也不替代独立的课程 MCP 教学任务。
