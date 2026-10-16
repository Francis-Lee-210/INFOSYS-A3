# Issue #33：OpenCode 开发记录

16 October 2026。按 Francis 的安排，从 #32 的 head `f6281c9` 建立 `fix/packager-import-integrity`，
PR base 为 `codex/receipt-recovery-source-sync`。负责人：Rae（Rae404）。

本记录只写 OpenCode 在本项目中的实际开发过程。独立复核、验收、真实仓库打包与浏览器证据由验收文档
另行保存；本记录不复制这些会话外或独立产生的结果。

## 第一轮开发（原始提交）

- 模型 `openai/gpt-6-luna`。
- Session：`ses_ebd27822fffeHMwPqWGz5hgGYc`，标题 "A3 Issue 33 - packager import integrity"。两轮在同一 session 内完成
  （第二轮第一次运行在启动阶段无响应，停止后以同一提示词在同一 session 重新运行）。
- 只修改 `tools/package-source.mjs` 和 `tools/tests/package-source.mjs`；OpenCode 不执行 git 操作。

1. **引用完整性检查**。提示词给出复现经过（`browser.mjs` 引用 `./issue-27.mjs`，清单缺失，解压后
   `ERR_MODULE_NOT_FOUND`）和要求：在内容扫描之后、创建输出目录和 `git archive` 之前，扫描 payload 中
   `.js`/`.mjs` 的静态 import、side-effect import、`export … from` 和字符串字面量 `import()`，
   相对路径按 POSIX 规则解析，必须正好是 payload 中的文件，否则报出引用文件和缺失目标并失败。
   新增 6 个打包测试，34/34 通过；真实仓库打包 17 个条目。提交 `03cb7a2`（fix）、`15eaf75`（test）。
2. **修正漏检**。第一轮的模式在 `from` 之前用了可跨语句的懒惰匹配，`export` 声明、`import.meta`
   或非字面量 `import()` 之后的本地引用会被吞掉。改为 clause 不能包含引号、分号和括号。
   新增漏检回归和多行 import 列表的通过用例，36/36 通过。提交 `f5e3806`（fix）、`7920848`（test）。

以上两轮与提交 `03cb7a2`、`15eaf75`、`f5e3806`、`7920848` 绑定，是历史记录；PR #34 复核后的修复
不改写这些提交和数字。

## PR #34 复核后的修复（本次 session，17 October 2026 NZDT）

- Session：`ses_ebb8230ceffewOOTJzeiMVgQ3p`。
- 模型：先以配置的 `opencode/ll-alpha-free` 只读排查（未改动文件）；再由配置的
  `deepseek-100/deepseek-v4-pro` 写出一个中间版词法扫描器；最后由配置的
  `deepseek-100/deepseek-v4-flash` 集成独立提供的词法参考、补齐回归并完成最终检查。
- 修改范围：`tools/package-source.mjs`、`tools/tests/package-source.mjs`，新增 `tools/lib/scan-imports.mjs`。

1. **红测**。先用既有 throwaway-repo 助手加入 12 条黑盒回归（`from` 与来源之间的注释、side-effect
   `import` 后注释、`import()` 内注释、引号 import 名、转义斜杠隐藏的缺失模块、模板 `${…}`
   表达式内的真实 import、缺失模块的 `?query#fragment`、已存在模块名的转义点、已存在路径的
   `?query` 与 `#fragment`，以及被忽略的注释/普通字符串/模板文本/属性调用文本、拼接 `import()`
   仍被忽略）。旧的正则守卫下打包套件 **40/49 通过、9 失败、退出码 1**（37 条既有用例全部保留
   并通过，9 条失败正是新回归覆盖的缺口）。
2. **词法扫描器集成**。`tools/lib/scan-imports.mjs` 的词法参考由独立词法审计 agent 编写并提供，
   OpenCode 将其作为输入集成并如实标注来源，不声称 OpenCode 原创该参考。集成时去掉参考顶部 4 条
   临时/来源注释并改为简短实现范围注释。`tools/package-source.mjs` 改为调用 `collectModuleReferences`，把解码后的
   `./`、`../` specifier 用 `new URL(specifier, pathToFileURL(resolve(ROOT, path)))` 加 `fileURLToPath`
   解析，再以 POSIX 斜杠形式的 `relative(ROOT, target)` 与 PAYLOAD 比对，缺失或越界在创建任何输出之前
   失败（无法解析的 file URL 仍报出引用文件与 specifier）。原有全部打包检查、固定 blob 扫描、安全 argv
   子进程、仅内建运行时、不猜测扩展名、不执行 payload 和仓库包含关系保持不变；17 个应用 payload 文件
   未改动。
3. **绿测**。再补 7 条黑盒回归（已存在文件的百分号编码名 `%2E`、编码穿越缺失目标、引号 export 名、
   非字面量外层 `import()` 内部的真实嵌套 import、`if` 条件后的正则 import 文本、函数表达式后除法接
   真实 import、类表达式后除法接真实 import）。全部改动的 `.mjs` 通过语法检查；完整打包套件
   **56/56 通过、0 失败、退出码 0**（临时输出已清理）。

## 本次运行证据

- 旧守卫红测：**40/49**（9 失败，退出码 1），输出 `/private/tmp/a3-pr34-opencode-red-tests.txt`。
- 修复后绿测：**56/56**（0 失败，退出码 0），输出 `/private/tmp/a3-pr34-opencode-green-tests.txt`。
- 未调用 SAP，未使用 key，未运行 npm 或浏览器。

独立 33 用例夹具、真实仓库打包与浏览器验收由 parent 在[验收矩阵](../validation/issue-33-acceptance.md)中另行记录。
