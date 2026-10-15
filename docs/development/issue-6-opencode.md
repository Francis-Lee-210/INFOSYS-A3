# Issue #6：OpenCode 开发记录

15 October 2026：实现及独立验收完成，等待PR审核/合并。

Francis要求“PR 已经合并，继续做 #6”，沿用明确授权的本机OpenCode CLI路线。
远端已核实#18于04:53:50 UTC合并为e7a06fef11a38a68f77fd46958751312c592a876，
#5随后关闭。从该main建立codex/issue-6-cost-evidence独立worktree。
原A3目录14份dirty/untracked课程文件逐份SHA-256保持不变，未混入提交。

## 实际CLI与分工

- CLI：/opt/homebrew/bin/opencode 2.0.28，沿用现有账号/模型配置。
- 实际session：ses_ec20e5c06ffeXF1kE0n6VRKiZt；标题A3 Issue 6 - cost evidence。
- OpenCode完成首轮实现，并在同一session执行主代理审查的定点修复脚本。
  Codex负责需求核对、独立审查、结果核验、界面截图、文档及GitHub整合。
- Native Luna审查验收，Sol审查实现完整性。补充测试草稿经主代理审查后，
  同样由OpenCode写入工程；没有用其他执行冒称OpenCode开发。
- 首轮controller曾用宽泛进程清理中断6286预览；主代理停止该轮并恢复6286。
  后续限定为审查过的定点脚本，测试harness持有并清理自己的进程句柄。
  新预览独立使用6287。未修改账号、真实key或仓库保护规则。

## 实现及审查修复

- 保留#5的连接/列表/独立按key详情。只有当前来源的有效匹配详情能启用金额审阅；
  Back保留所选行并恢复焦点。换源/选择/重载/reset清除旧快照。
- Screen2展示短解释、原净额/税/总额、币种/basis、来源/provenance/profile、
  受控日期语义、检索时间及缺失证据，沿用现有配色/字体和金额表。
- 第二kind是独立synthetic契约fixture，API ID/version为null，未伪造另一live映射。
- 精确金额保留字符串；fixture声明的header关系用BigInt系数/scale核对。
  live/request对账保持unassessed，未杜撰SAP通用等式或容差。
- optional items显式读取金额/币种，并核对父记录、API/version、profile、
  provenance及continuation。缺失/读取失败保持Unknown/Not available；
  明确结构或已知币种冲突才设置material flag。
- 修复独立审查发现的异步缺陷：items返回时若金额页已打开，同步重建可见/导出快照；
  若已Back、换源或reset，过期响应不能恢复旧结果。增加HTTP response gate回归。
- Back使pending请求失效时清除checking状态；重新进入不会永久显示读取中。
  回归同时检查过期响应返回前/后的重新进入，已完成的coverage仍保留。
- 补齐两种kind的USD→NZD同会话切换，明确#7 rule scope：
  synthetic consistent只指header声明关系，linked monetary reconciliation始终not-assessed。
- 修复390px页面溢出，金额表内部可横向滚动，日期/来源换行；Back焦点可用。

## 实际验证

OpenCode完成31/31，修复异步问题后32/32；最终规则范围及补充验收仍由同一session执行。
主代理随后在新端口6965独立运行未管道截断的npm test，退出码0，**34/34 PASS**：
原15组#5回归及19组#6测试。见[原始输出](../validation/issue-6-browser-test-results.txt)。

桌面1366px与手机390px均无整页横向溢出（pageWidth分别1366/390），无pageerror；
金额页进入焦点及Back所选行焦点通过，截图已目视检查。
JS/MJS语法、git diff --check、原课程文件与冻结API规格hash由主代理核对。

[逐条验收矩阵、截图及边界](../validation/issue-6-acceptance.md)。
本轮没有真实SAP调用；#5原B0文件保持原样。测试中的live transport是受控注入，
synthetic浏览器B0元数据不构成新增live证据。未实施#7选择/receipt或#8完整分页。
