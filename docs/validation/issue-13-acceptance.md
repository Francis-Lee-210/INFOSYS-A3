# Issue #13 acceptance evidence

17 October 2026 (NZDT). Branch `docs/13-course-readiness`, based on `main` at `28aee9d` (after #28).
Course-requirement record and Technical Academy MCP exercise evidence for
[#13](https://github.com/Francis-Lee-210/INFOSYS-A3/issues/13). No application code was changed.
No API key, password, login address or credential-bearing configuration appears in this record or its screenshots.

Overall status: **ALL PASS**

## Acceptance matrix

| # | Criterion | Evidence | Result |
|---|---|---|---|
| 1 | Official specification, rubric, Canvas notices/modules and Staff clarifications checked with links and check time; 200/100 discrepancy kept visible | [Source check](#source-check) | PASS |
| 2 | Source-ZIP deadline conflict recorded; preparation follows the earlier confirmed guidance unless superseded | [Deadlines](#deadlines) | PASS |
| 3 | Lab 12 slot and solution-video instructions tracked; unpublished items recorded with a preparation decision; no Staff message sent | [Lab 12 and video](#lab-12-and-video) | PASS |
| 4 | OpenCode Desktop access verified; student MCP server built and deployed through the Technical Academy exercise, with sanitized evidence | [OpenCode](#opencode-desktop), [MCP exercise](#technical-academy-mcp-exercise) | PASS |
| 5 | Exercise stopped after MCP deployment; Developer Hub Units 4 and 5 not added as A3 requirements | [MCP exercise](#technical-academy-mcp-exercise) | PASS |
| 6 | Own build/deployment distinguished from course-server checks or a local client connection | [What counts as deployment](#what-counts-as-deployment) | PASS |
| 7 | Purchase Order MCP exercise kept separate from the billing app's transport | [Exercise vs app](#exercise-vs-app) | PASS |
| 8 | Prompt prerequisites confirmed (spec, sandbox URL, locally supplied key) with a safe key-handling method | [Prompt inputs](#prompt-inputs-and-key-handling) | PASS |
| 9 | Actual GenAI tools/tasks and course integrity guidance recorded without an invented exemption or blanket ban | [GenAI](#genai-tools-and-guidance) | PASS |
| 10 | Missing access or proof stated as an exact external dependency, with the criterion left open | [Open items](#open-items) | PASS |

## Source check

Sources below were re-checked by Kevin on **17 October 2026, about 05:00 NZDT**, and match this record. Canvas and Ed links require course access.

| Source | Link | What it says |
|---|---|---|
| Canvas A3 assignment page | https://canvas.auckland.ac.nz/courses/143335/assignments/510627 | Export captured 15 Oct 2026 22:26: header "Due Tuesday by 23:59", "Points 200"; the embedded rubric ends "Total Points: 100". Unchanged at the 17 Oct re-check |
| V3 specification (`704_A3_2026 Build App_Specificatication and Marking Criteria_V3.docx`) | https://canvas.auckland.ac.nz/courses/143335/files/18972989 | "Marked out of 200". ZIP "exported from OpenCode.ai" by **Monday, 19th October, 11:59 AM**; slides by **Tuesday, October 20th, 11:59 AM**, with the groupwork management slide last. "Remember not to delete any content from OpenCode.ai until marking is complete." Repository copy: [Specification-and-Rubric.docx](../../Specification-and-Rubric.docx) |
| Week 11 notice | https://canvas.auckland.ac.nz/courses/143335/discussion_topics/1645070 | Announcement "Welcome to the penultimate lecture and lab week, Week 11!": ZIP of the functional App prototype by **Tuesday, 20th October, 11:59 AM**; "Remember not to delete any content from the OpenCode.ai environment until marking is complete". Week 11 lab runs as an SAP workshop on building functional apps, attended with group members. The ZIP date differs from the V3 specification and the newer 14 Oct Staff reply (recorded in [#4](https://github.com/Francis-Lee-210/INFOSYS-A3/issues/4)) |
| Ed #44 A3 Assignment Changes | https://edstem.org/au/courses/36662/discussion/3614389 | 2 Oct: A3 delivered via OpenCode.ai and SAP APIs; Options 1/2/3. 12 Oct (Umesh Nayak, relaying Jason Tran): install OpenCode Desktop; students complete the Technical Academy exercise and build an MCP server for the Purchase Order API. No later reply changes this record |
| Ed #50 Week 10 Lab Notes | https://edstem.org/au/courses/36662/discussion/3633935 | 11 Oct: "Students need to stop after deploying the MCP Server. No need to complete Unit 4 and Unit 5 related to Developer Hub." Prompts must pass the API spec file, Sandbox URL and API Key; the lab prompt was only an example |
| Ed Staff delivery reply (14 Oct) | https://edstem.org/au/courses/36662/discussion/3642127?answer=7908841 | ZIP / PowerPoint / recording / groupwork / pitch guidance: source ZIP 19 Oct 11:59 AM and PowerPoint 20 Oct 11:59 AM; the solution video recording is included in the PowerPoint submission; groupwork slide last; five-minute pitch |
| Canvas Modules | https://canvas.auckland.ac.nz/courses/143335/modules | Week 10 holds the SAP API Pool, the SAP lab tutorial and the Lab 2 recording ([Ed #46](https://edstem.org/au/courses/36662/discussion/3620142), [Ed #50](https://edstem.org/au/courses/36662/discussion/3633935)) |
| Week 10 Lab 2 recording, recorded 7 Oct 2026 (Canvas Modules – Week 10) | https://canvas.auckland.ac.nz/courses/143335/modules | Quoted below; timestamps approximate. Wording checked by Kevin against the recording |
| Existing clarification record | [A3_Staff_Clarifications.md](../requirements/A3_Staff_Clarifications.md) | Verbatim Staff answers, last checked 13 Oct |

**200/100 discrepancy:** the Canvas assignment header and the V3 specification state 200 points, while the rubric embedded on the
Canvas assignment page totals 100. Criterion proportions agree in both: Rationale 5%, Design 15%, Functionality 30%, Usability 25%,
Presentation 25%. This record does not resolve the discrepancy.

## Deadlines

| Source | Source ZIP | Slides |
|---|---|---|
| V3 specification | Mon 19 Oct 2026, 11:59 AM NZDT | Tue 20 Oct 2026, 11:59 AM NZDT |
| Canvas assignment shell | — | Tue 20 Oct, 23:59 (15 Oct export) |
| Week 11 notice | **Tue 20 Oct, 11:59 AM** (superseded by the newer Staff reply) | — |
| Ed Staff reply, 14 Oct | Mon 19 Oct, 11:59 AM | Tue 20 Oct, 11:59 AM |

**Decision:** the team prepares to the earlier morning deadlines — source ZIP **Mon 19 Oct 11:59 AM** and slides **Tue 20 Oct 11:59 AM**
(NZDT). The later Canvas shell time is not treated as an extension. No newer authoritative guidance was found at the 17 Oct re-check.

## Lab 12 and video

- Lab 12 pitch: five minutes during Lab 12 at the group's assigned time slot (V3). No separate group slot is recorded in the sources above as of 17 Oct; #16 confirms it before the pitch.
- Solution video: Staff require it to be included in the PowerPoint submission. No duration or external-link rule is published as of 17 Oct.
- Preparation decision while any rule is unpublished: embed the solution recording as an MP4 inside the PowerPoint and test playback on a
  second device under [#16](https://github.com/Francis-Lee-210/INFOSYS-A3/issues/16). No duration or external-link permission is assumed.
- No message was sent to Staff by this issue.

## OpenCode Desktop

OpenCode Desktop **2.0.29** on Windows 10, About page checked 17 October 2026.
[Screenshot](issue-13-opencode-version.png). The same installation was used for the #9 implementation
([development record](../development/issue-9-opencode.md)).

## Technical Academy MCP exercise

Workbook "Build & Run an MCP Server on SAP Integration Suite to access S/4HANA Cloud" (SAP Basic Trials), accessed with the
individually assigned course trial account issued in the Week 10 Lab. The account identifier and password are not recorded.

| Unit | Done | Note |
|---|---|---|
| 1 Overview | Yes | Read |
| 2 Pre-Configuration Steps | Yes | Downloaded the `CE_PURCHASEORDER_0001` (OData V4) EDMX from the SAP Business Accelerator Hub on 17 Oct; the destination was pre-configured by the exercise |
| 3 Create MCP Server on SAP Integration Suite | Yes | Created the content package, added the Purchase Order API on the Integration Cell runtime, then added the MCP server on that API and deployed it |
| 4 SAP Developer Hub | No | Not required (Ed #50) |
| 5 Validate MCP Server functionality | No | Not required (Ed #50) |

Observed on 17 October 2026, as displayed by Integration Suite:

| Item | Value |
|---|---|
| Package artifacts | One API and one MCP Server (`Artifacts (2)`) |
| MCP server | Created 2026/10/17 04:36:30; **Deployed on Oct 17, 2026, 4:37:56 AM, Runtime Status: STARTED** |
| MCP server configuration | Source type API (the package's Purchase Order API); MCP path `/mcp_po_<account suffix>`; version 1.0.0; runtime profile Integration Cell |
| Policy model | Agent → MCP → Authentication → Authorization → Request Reply → HTTP → Target |
| API artifact | Deployed to the Integration Cell |

Screenshots: [package artifacts](issue-13-mcp-package-artifacts.png) · [deployed MCP server and policy model](issue-13-mcp-deployed.png) ·
[MCP server details](issue-13-mcp-overview.png) · [MCP source API](issue-13-mcp-source-api.png).
The MCP URL, virtual host and the creating user's address are redacted. Artifact names carry the trial-account suffix
used in the exercise; the password is not recorded anywhere.

**Limit:** Unit 5 was not performed, so no functional MCP tool call is claimed. The evidence is the deployment status.

## What counts as deployment

Only the deployment above is evidence of a student-built server. None of the following is used as deployment proof:

- checks run against the existing course server;
- a local client or broker connection;
- [`examples/purchase-order/`](../../examples/purchase-order/README.md), a copied lab page that calls the SAP sandbox directly from the
  browser and is not an MCP integration.

## Exercise vs app

The Purchase Order MCP server is a teaching exercise. The team's app, Billing Review Lite, reads
`API_BILLING_DOCUMENT_REQUEST_SRV` ([config.js](../../app/lib/config.js)) through browser → local adapter
([server.js](../../app/server.js)) → SAP sandbox, selected under [B0](issue-5-b0.md). It does not use MCP.

In the Week 10 Lab 2 recording (about 23:00–24:30), SAP's Jason Tran said that the group project does not need to build an MCP
server: the app can be built with OpenCode, and the requirement is to connect it to the SAP sandbox (paraphrased from the
recording). The course therefore does not require every group to build a
Purchase Order app or to route all application requests through MCP.

## Prompt inputs and key handling

| Input | Location |
|---|---|
| API specification | [API_BILLING_DOCUMENT_REQUEST_SRV.openapi.json](../../resources/api/specs/API_BILLING_DOCUMENT_REQUEST_SRV.openapi.json) |
| Sandbox URL | `SANDBOX_BASE_URL` in [config.js](../../app/lib/config.js) |
| API key | Not stored anywhere in the repository. Entered at runtime in the app and kept in session memory only |

OpenCode keeps session prompts in a local database, and [#17](https://github.com/Francis-Lee-210/INFOSYS-A3/issues/17) retains the
group's OpenCode records until marking. A real key pasted into a prompt would therefore be retained and could be handed over with
those records. Prompts use a placeholder such as `APIKey: <provided at runtime>` instead, and the key is supplied only in the running
app. In the recording (about 53:30–54:10) Jason Tran said that uploading an API key string in a prompt is "not best practice" because
"there's security issues with that".

## GenAI tools and guidance

Kevin used OpenCode 2.0.29 for the #9 implementation, other members' tools are disclosed in their records under [docs/development/](../development/).
This follows the course GenAI rule (Week 6) as recorded in [作业要求.md](../../作业要求.md): OpenCode being the prescribed development tool does not permit
undisclosed AI authorship of the academic analysis, so AI assistance is disclosed. No blanket exemption or ban is assumed.

## Open items

None.
