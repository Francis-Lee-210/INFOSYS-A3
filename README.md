# INFOSYS A3 — Spark group workspace

小组的A3候选比较、SAP API参考、技术练习和后续应用开发资料。

**当前平台：OpenCode.ai + SAP APIs。** 四份候选文件已收集，归属已于14 October核对；尚未在现有资料中记录团队最终决定。此仓库初始化不表示API/MCP部署、A3应用开发或课程提交已经完成。

## 从哪里开始

1. 阅读[作业要求与评分crosswalk](作业要求.md)及[官方V3规格](Specification-and-Rubric.docx)。
2. 阅读[Staff澄清](docs/requirements/A3_Staff_Clarifications.md)，特别是API适配与MCP教学范围。
3. 比较下列候选，在[选题工作表](decisions/A3_选题工作表.md)记录API适配、理由和真实团队决定。
4. 确定一个核心功能后，再开发正式应用。正式应用尚未建立；开发时在`app/`中维护源码和运行说明。

| 文件标签 | 候选业务方向 | 方案 |
|---|---|---|
| Francis | Strategic/Competitive | [PlanFit Navigator Core](candidates/A3_App_Candidate_Options-Francis.md) |
| Kevin | Organisational | [Verified Knowledge Handover](candidates/A3_App_Candidate_Options-Kevin.md) |
| Rae | Financial | [Plan Review Snapshot](candidates/A3_App_Candidate_Options-Rae.md) |
| Ryan | Operational | [Fibre Handoff Desk](candidates/A3_App_Candidate_Options-Ryan.md) |

候选正文与估算主要保留23 September的研究状态。旧Build Apps/AppGyver/Build Code实现段不可直接作为当前开发指引；适配新版API后需重新验证范围与工时。[历史平台笔记](docs/platform-history/A3_Platform_Feasibility_Notes_2026-09-23.md)只供了解当时的判断。

## 目录

```text
candidates/               四份个人候选方案
decisions/                选题工作表和组员Agent提示词
docs/requirements/        A3相关Staff原文摘录
docs/platform-history/    23 September旧平台研究
references/Francis/       Francis的四项既有作业参考
references/Kevin/         Kevin的四项既有作业参考及AS-IS/TO-BE
resources/api/            SAP API Pool与教学EDMX
resources/course/         Lab 7、8比较方法参考
resources/templates/      Groupwork Management Slide
tools/                    SAP API检查脚本
examples/purchase-order/  独立Lab参考页面
```

[资源说明与复制记录](resources/README.md)列出来源。外部课程文件与Lab文件只复制；[Francis](references/Francis/README.md)和[Kevin](references/Kevin/README.md)的A1/A2参考已按授权复制入仓库；原件仍在个人工作区。未打包来源在候选文档中以文件名定位。Canvas/Ed链接需要课程权限。

## 运行采购订单参考页面

此例是独立Lab练习，通过浏览器直接GET SAP sandbox，不是部署好的MCP或获选A3应用。

从仓库根目录执行：

```sh
python3 -m http.server 6282 --bind 127.0.0.1 --directory examples/purchase-order
```

打开 <http://127.0.0.1:6282/>，在页面内输入自己的sandbox API Key。操作及验证边界见[示例README](examples/purchase-order/README.md)。本次整理只核对文件和脚本语法，没有重新运行带Key的实时API。

## 检查候选API

需Node.js 18或以上。在终端输入Key，避免把真实Key写进源码或命令历史：

```sh
read -r -s -p 'SAP sandbox API key: ' SAP_APIKEY
printf '\n'
export SAP_APIKEY
node tools/sap_api_probe.mjs
unset SAP_APIKEY
```

上述输入段适用于Bash；使用macOS的zsh时，可先运行`bash`。脚本会发起GET并生成已被`.gitignore`排除的`tools/sap_api_probe_result.json`。部分URL仍是待核对路径；有记录的200响应也不证明API字段满足业务需求。查看原始样本前注意数据边界。

## 组内协作

- 克隆本仓库，在自己的分支修改，通过Pull Request合并。PR中写清改动、验证和未解决项。
- 在选题工作表记录实际选择与分工，不预填个人贡献百分比。
- API Key、Token、真实`.env`及含凭证的MCP/OpenCode配置留在本机；共享配置须先移除凭证。
- 合成数据明确标注，不冒充Spark内部数据。访谈原文和个人全文共享需当事人同意。
- GitHub共享不能代替Canvas提交。ZIP、pitch与评分前保留要求见作业要求；截止冲突仍须课程确认。
