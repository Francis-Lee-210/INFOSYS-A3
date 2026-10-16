# Issue #33：OpenCode 开发记录

16 October 2026。按 Francis 的安排，从 #32 的 head `f6281c9` 建立 `fix/packager-import-integrity`，
PR base 为 `codex/receipt-recovery-source-sync`。负责人：Rae（Rae404）。

## OpenCode

- 模型 `openai/gpt-6-luna`。
- Session：`ses_ebd27822fffeHMwPqWGz5hgGYc`，标题 "A3 Issue 33 - packager import integrity"。两轮在同一 session 内完成
  （第二轮第一次运行在启动阶段无响应，停止后以同一提示词在同一 session 重新运行）。
- 只修改 `tools/package-source.mjs` 和 `tools/tests/package-source.mjs`；OpenCode 不执行 git 操作。

## 两轮开发

1. **引用完整性检查**。提示词给出复现经过（`browser.mjs` 引用 `./issue-27.mjs`，清单缺失，解压后
   `ERR_MODULE_NOT_FOUND`）和要求：在内容扫描之后、创建输出目录和 `git archive` 之前，扫描 payload 中
   `.js`/`.mjs` 的静态 import、side-effect import、`export … from` 和字符串字面量 `import()`，
   相对路径按 POSIX 规则解析，必须正好是 payload 中的文件，否则报出引用文件和缺失目标并失败。
   新增 6 个打包测试，34/34 通过；真实仓库打包 17 个条目。提交 `03cb7a2`（fix）、`15eaf75`（test）。
2. **修正漏检**。第一轮的模式在 `from` 之前用了可跨语句的懒惰匹配，`export` 声明、`import.meta`
   或非字面量 `import()` 之后的本地引用会被吞掉。改为 clause 不能包含引号、分号和括号。
   新增漏检回归和多行 import 列表的通过用例，36/36 通过。提交 `f5e3806`（fix）、`7920848`（test）。

## 运行与测试

每轮 OpenCode 运行打包测试和真实仓库打包（临时输出已删除）。各提交另行在独立 worktree 中重跑。
最终打包测试 **36/36 PASS**，解压后的包 `npm ci` 加完整浏览器测试 **161/161 PASS**。
见[打包测试输出](../validation/issue-33-package-test-results.txt)与[验收矩阵](../validation/issue-33-acceptance.md)。
未调用 SAP，未使用任何 key。
