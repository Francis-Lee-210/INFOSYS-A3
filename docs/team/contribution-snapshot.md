# Team contribution snapshot

Snapshot date: **18 October 2026 (NZDT)**. Status: **work-to-date contribution split confirmed; final release update pending** (Issues #14 and #16).

This public record lists work that can be traced to GitHub pull requests, issues, reviews and commits. Member
UPIs go only on the Groupwork Management slide submitted with the pitch slides on Canvas, not in this public
repository. Work after this date (slides, recording, pitch, uploads) is added in the release update described
below, not assumed here.

## Members

| Member | GitHub |
|---|---|
| Francis Lee | `Francis-Lee-210` |
| Ryan Li | `RIOne1` |
| Xuan Zeng | `wanyan2333` |
| Rae Huang | `Rae404` |

## Contributions to date

Each member's work is grouped the same way: solution and decisions, implementation, review and quality, and
assessment material.

### Francis Lee

| Area | Evidence |
|---|---|
| Solution and decisions | Set up the repository; broke the A3 work into Issues #4–#17; first direction confirmation in #11; original PlanFit candidate (A1/A2). |
| Implementation | SAP billing-request reader with live B0 evidence (#5, PR #18); cost-evidence implementation (PR #19 → #20; Ryan's focus fix remains credited to Ryan); source package and live workflow (#10, PR #30); receipt-recovery fixes and refreshed handoff (PR #32, shared with Xuan's storage-recovery work). |
| Review and quality | Approved PRs #1, #3 and #22; PR #26 review, focus-gap reproduction and repaired-build verification; PR #34 review-driven import-check repair and independent acceptance ([87aaaa4](https://github.com/Francis-Lee-210/INFOSYS-A3/commit/87aaaa42db00ccb8972d89b8af786d9f4e6bafc7); [23de94d](https://github.com/Francis-Lee-210/INFOSYS-A3/commit/23de94d0cdf65bfdefe3a7fb1e10b9cbec514e30)). Rae's original packaging guard and Xuan's earlier comment-safe changes remain credited to them. |
| Assessment material | Sanitized live-read/workflow and independent-run records for #5/#10; manual walkthrough of Ryan's standalone #12 wireframe (see [the record](https://github.com/Francis-Lee-210/INFOSYS-A3/blob/28aee9d7390ce69a2a3476d151abe0f9458e2831/docs/validation/issue-12-francis-manual-walkthrough-2026-10-16.md)), kept separate from live SAP and application-persistence acceptance. |

### Ryan Li

| Area | Evidence |
|---|---|
| Solution and decisions | Four-candidate comparison and Effort–Impact matrix proposing Billing Review Lite (#11, PR #22); original Fibre Handoff candidate (A1/A2). |
| Implementation | Pagination and connection recovery (#8, PR #24); receipt review corrections (#7 follow-up, PR #23); focus fix in the cost screen (PR #20). |
| Review and quality | Approved PRs #26 and #29; reproduced and fixed five receipt defects found in review of PR #21. |
| Assessment material | Design adaptation, wireframes and model-change map (#12, PR #28); uploaded members' A1/A2 references (PR #1). |

### Xuan Zeng

| Area | Evidence |
|---|---|
| Solution and decisions | Original Knowledge Handover candidate (A1/A2), retained as the preferred fallback in #11; corrected the Kevin/Ryan candidate labels (PR #3). |
| Implementation | Three-screen consistency and keyboard accessibility (#9, PR #26); storage-recovery fixes pushed to PR #32; comment-safe import scanning pushed to PR #34. |
| Review and quality | Approved PRs #21, #24 and #32; found the storage-recovery and import-scan gaps fixed above. |
| Assessment material | OpenCode and course MCP readiness (#13, in progress). |

### Rae Huang

| Area | Evidence |
|---|---|
| Solution and decisions | Author of the selected solution (annual plan-review proposal, A1/A2); CONFIRM in #11; model-owner review of the TO-BE mapping in PR #28. |
| Implementation | Intent confirmation and minimal receipt (#7, PR #21); storage-unavailable start and screen names (#27, PR #29); packaging import-integrity check (#33, PR #34). |
| Review and quality | Approved PRs #18, #20, #23, #26, #28 and #30; found the cross-PR packaging defect (missing `issue-27.mjs`) before the final ZIP. |
| Assessment material | This contribution snapshot (#14). |

Across members: 15 or more non-merge commits each on `main`, at least two implementation pull requests each, and
reviews of other members' work by every member.

## Contribution split

| Member | Proposed share | Confirmed by member |
|---|---|---|
| Francis Lee | 25% | ☑ Francis confirmed in group discussion, 18 Oct |
| Ryan Li | 25% | ☑ PR #35 comment, 16 Oct |
| Xuan Zeng | 25% | ☑ #14 comment, 16 Oct |
| Rae Huang | 25% | ☑ proposer, PR #35 |
| **Total** | **100%** | |

The 25% each split is the **confirmed contribution allocation for work completed to date**, following the group's discussion on 18 October. This supersedes Francis's 17 October Issue #14 note that his percentage was still pending. The later slides, recording, pitch and upload work remain planned and will be reconciled in the #16 release update, with final member sign-off before the groupwork slide is frozen.

## Responsibilities

| Responsibility | Due | Member |
|---|---|---|
| Upload the OpenCode ZIP to Canvas (rebuilt from final `main` after a clean-directory retest) | Mon 19 Oct, 11:59 AM | Ryan (PR #35 comment) |
| Upload the pitch slides (groupwork slide last) to Canvas | Tue 20 Oct, 11:59 AM | Xuan (#14 comment; needs the final PPT and demo recording in time to check) |
| Pitch part 1 — Situation: Spark's annual plan review and the customer need (≈1:00) | Lab 12 | Francis (confirmed in Issue #14, 17 Oct; preparation and presentation remain planned) |
| Pitch part 2 — Complication: why bills are hard to interpret and the business impact (≈1:00) | Lab 12 | Rae |
| Pitch part 3 — Resolution: Billing Review Lite, Option 2 adaptation and SAP API fit (≈1:15) | Lab 12 | Ryan (PR #35 comment) |
| Pitch part 4 — App demonstration, next steps and groupwork slide (≈1:30) | Lab 12 | Xuan (#14 comment) |
| Keep OpenCode projects and records until marking ends (#17) | After marking | Each member for their own sessions |

## Release update

Before the groupwork slide is frozen, #16 updates this record with work done on the slides, recording and pitch,
and every member gives a final sign-off. The course may moderate individual contribution; this record is evidence,
not a guarantee of any mark.
