# Spark NZ A3 App Candidates for Group Selection

> **Repository preparation — 14 October 2026:** This is an individual candidate proposal dated 23 September 2026, not a recorded team decision. Current [V3 requirements](../作业要求.md) specify **OpenCode.ai + SAP APIs**. Build Apps/AppGyver/Build Code sections and their effort estimates below are retained as historical planning; API fit and revised implementation effort require validation. Local-only A1/A2 evidence is identified by source filename and is not bundled.

> **Attribution corrected — 14 October 2026:** This file was previously labelled Kevin. Its body and source register describe Ryan Li’s operational A1/A2 route, and Kevin identified the Verified Knowledge Handover candidate as his own, so the two filenames were swapped. Ryan should confirm before contributions are assigned.


**Prepared:** 23 September 2026  
**Status:** Exploratory planning input. No app has been built or tested.  
**Scope:** Ryan Li's operational route across A1 and A2, translated into four comparable A3 candidates. The group would select one candidate after comparing it with the other members' proposals.

**Provisional recommendation:** Shortlist **C1, Fibre Handoff Desk**, as the strongest demonstration of the conditional P1 solution in the latest A2. Keep **C2, Fibre Progress and Recovery**, as the smaller alternative. C3 tests the competing diagnosis/routing explanation; C4 follows the immediate evidence-gathering stage of A2 most closely. These are alternatives, not a combined feature backlog.

The recommendation concerns suitability for an assessed prototype. It does not establish that handoff ownership is Spark's main problem or that Spark should purchase a new application.

## 1. Evidence and interpretation

The following labels apply throughout:

- **Fact:** A requirement or statement verified in the cited course materials or A1/A2 files. A statement in a student report is evidence of the proposed route, not independent confirmation of Spark's operations.
- **Proposal:** A design choice introduced in this document.
- **Assumption:** A condition used to estimate or scope the prototype.
- **To validate:** A question that remains open. No tests or client validation have occurred.

All candidate names, screens, sample cases, effort estimates and prototype acceptance targets below are **proposals or assumptions**, unless explicitly attributed to a source.

### The route that A3 should preserve

| Source | Verified direction in the source | Implication for A3 |
| --- | --- | --- |
| A1-D1, Sections 8–15 [E1] | Residential broadband issue resolution; context continuity, correct routing, ownership/status visibility, communication and restoration confirmation. H1–H4 are testable explanations. | Build around a specific service episode and an observable operational action. |
| A1-D2, Sections 6–9 [E2] | Conditional P4 orchestration pilot, including a persistent Spark case owner, a handoff packet, partner acceptance, status, retesting and same-case reopening. Interviews do not establish an internal cause. | Reuse these process concepts, while retaining their evidence limits. |
| A2-D1, Sections 1–5 and Table 2 [E3] | A six-week diagnosis precedes intervention selection. Scope narrows to residential fibre, one region and one principal partner. P1, P2, P3 and P6 are independent alternatives; P4 combines only justified controls. | The latest A2 qualifies A1's preference for a hybrid. A3 should implement a bounded candidate, with a clear reason for each control. |
| A2-D2, slides 4–10, 16–17 and supporting script [E4] | Handoff ownership remains conditional. The base financial scenario does not justify full investment; later spending remains uncommitted. | Demonstrate a mechanism and how it could be evaluated. Do not present the prototype as a proven business case. |

**Important reconciliation:** The A2 request for NZ$36,846 is a proposed consulting diagnosis ceiling, not an A3 development budget. The 24-delivery-week engagement is also separate from the classroom prototype schedule. A1's 41%/52% survey figures and A2's 36%/46% figures describe different survey populations/windows; they must not become a before-and-after chart. The A1 composite satisfaction index is author-developed and unvalidated. None is a measured prototype outcome. [E1–E4]

The strongest continuity statement for the group is: **“We are prototyping a selected operational control from Ryan's A2 options so that its workflow, usability and measurement can be examined before any real deployment.”** Group selection and any required classroom approval remain pending; actual Spark approval is not evidenced.

## 2. Current A3 requirements and unresolved differences

The live Canvas assignment, linked specification, Week 8 lab slides and course announcements were checked on 23 September 2026. [E5–E9]

**Confirmed common requirements:** A3 is a group assessment worth 20% of the course. Select and justify one solution linked to the team's earlier work; apply Design Thinking; produce a functional prototype with at least one working feature; make the full workflow usable; and deliver a five-minute CEO-facing pitch using Situation–Complication–Resolution. The specification requires a final groupwork contribution slide and retention of the project until marking finishes. Week 8 guidance requires group participation in Labs 8–12. [E5–E8]

| Item | Current evidence | Planning treatment |
| --- | --- | --- |
| Development platform | Canvas is titled **A3 Build Code**, and its functionality rubric says “SAP Build Code Development Guidelines.” Its overview, the linked V1 PDF and Week 8 slides still name SAP Build Apps/AppGyver. | Keep the business design portable. Confirm the required product and supplied lab environment before implementation. Build Code and Build Apps are distinct SAP offerings. [E5–E7, T1] |
| Prototype deadline | Canvas displays **20 October 2026, 23:59**. The V1 PDF says **19 October, 11:59 AM**, for the exported prototype ZIP. | Preserve both dates as a conflict. Plan readiness by **16 October**, an internal buffer rather than an official deadline. |
| Presentation upload | The PDF specifies **20 October, 11:59 AM**, with the five-minute pitch in the assigned Lab 12 slot. | Confirm the upload location and final deadline; do not assume the code deadline replaces it. |
| Mark totals | Canvas shows 200 assignment points but rubric rows totalling 100. The PDF uses 200 marks with the same proportions. | Compare candidates using the stable weights: rationale 5%, design 15%, functionality 30%, usability 25%, presentation 25%. |

The PDF's hint for rationale points to an effort–impact matrix. A2-D1 Figure 4 is a **customer-impact/financial-value matrix of benefits**, not an effort–impact matrix of app alternatives. Section 8 below provides a new, explicitly provisional option comparison rather than relabelling that figure. [E3, E6]

**Course evidence boundaries:** The Week 3 announcement prohibits contacting employees of the selected company and requires publicly available company information. Prototype evaluation therefore uses synthetic cases and classmates acting out roles; proposed real-world pilots remain hypothetical. The Week 6 announcement prohibits GenAI-written core intellectual content and requires specific disclosure of AI use. This is AI-generated exploratory input, not submission-ready assessed prose. The group should clarify whether this kind of candidate generation and later Agent comparison is permitted before incorporating it into assessed work. Disclosure alone does not resolve that question. [E9]

## 3. Candidate overview

| ID and candidate | Main user and decision | A1/A2 connection | Smallest complete working feature | Indicative total team effort* |
| --- | --- | --- | --- | --- |
| **C1 Fibre Handoff Desk** | Spark case coordinator: who must act next on a partner referral? | H3; conditional P1 | Save a referral, request missing information or accept it, and retain Spark accountability and a visible history. | **70–100 person-hours** |
| **C2 Fibre Progress and Recovery** | Customer and advisor: what happens next, and has service actually recovered? | H4; P3 | Publish a structured status update and record a customer retest response that changes the case state. | **55–80 person-hours** |
| **C3 Fibre Intake and Routing** | Frontline advisor: is the intake complete enough for a proposed route? | H1/H2; P6 | Validate intake, explain a rules-based route suggestion, and save the advisor's decision or override. | **60–90 person-hours** |
| **C4 Fibre Episode Review** | Analyst/service owner: is the episode evidence sufficient to support a decision? | A2 diagnosis; H1–H4 | Validate a synthetic event record, calculate eligible durations and save a supported/contrary/unknown evidence assessment. | **60–85 person-hours** |

*Estimates assume four students, an accessible course SAP environment, one browser-based prototype, synthetic data and no external system integrations. They include design, construction, testing, pitch preparation, packaging and contingency. They are not measured productivity, vendor quotations or guaranteed delivery times. Re-estimate after the platform and team skills are confirmed.*

### C1 Fibre Handoff Desk — preferred operational candidate

**Business value.** Give a Spark coordinator a visible next action when a referral moves to a technical partner. The proposed mechanism is that explicit acceptance and an exception queue reduce avoidable chasing and ambiguous waiting. Spark's customer-case responsibility remains visible while the partner owns technical work. This directly tests the workflow implied by conditional P1. [E2; E3, Table 2 and Figure 2]

**Example use.** An advisor opens synthetic case `F-104`, reviews the completed diagnostic notes and submits a referral to “Partner A.” A simulated partner reviewer requests a more specific test result. The advisor adds it and resubmits. The reviewer accepts under a named technical owner. The queue and timeline update while the Spark case owner stays unchanged. Later, a repair outcome leads to verification; an unsuccessful retest returns the same episode to review.

**Prototype scope:** five screens or reusable page views—work queue, episode detail/timeline, referral editor, simulated partner action, and verification. Include validation, information requests, acceptance, an overdue-review flag, restoration evidence and same-episode reopening. The customer response is entered as a simulated observation by the operator; a separate customer portal belongs to C2.

**Implementation approach.** A small state machine controls permitted actions. Save the episode, referral attempts and history; derive queue labels from saved values. Partner responses are entered within the demo. An overdue flag compares an explicitly entered review time with the current/demo time; it does not imply a Spark contractual SLA or require a background notification service.

**Verification.** Demonstrate that missing required information blocks submission; acceptance requires a named recipient; a request for information preserves the Spark owner and previous attempt; overdue referrals remain visible; and unresolved or failed retests cannot become verified restoration. Reload and reopen the case to prove persistence.

**Main work and limits.** State transitions, retries and coherent exception wording take most of the effort. This prototype does not prove reduced restoration time, a functioning partner interface or multi-user security. Additional administration could exceed time saved. Reject or narrow C1 if roleplay shows the control is unclear, or if it requires assumptions the group cannot explain.

### C2 Fibre Progress and Recovery — smaller alternative

**Business value.** Help a customer understand the current position, next action and next promised update, then capture whether a reported repair worked. Its proposed benefit is reduced uncertainty and unnecessary recontact. It may improve communication without shortening physical repair. This follows P3 in the latest A2. [E3, Table 2; E4, slides 6–7]

**Example use.** An advisor publishes “Partner investigation in progress; next update at 15:00.” The customer view shows when the information was last verified. After the advisor records a repair report and technical retest result, the customer selects “Working,” “Still unstable,” or “Unable to test.” The second response returns the existing episode to review; the third keeps the outcome pending. Verified recovery requires the successful technical result and customer confirmation in this demonstration.

**Prototype scope:** four views—advisor queue, update editor, customer timeline, and retest response. Use a small editable message template, a promised-update time and a stale-information label. Persist the update and response. Notifications appear inside the prototype; SMS and email delivery are outside scope.

**Implementation and verification.** Use structured update records and validation requiring a next step. Prevent a stale or unknown status from appearing as confirmed progress. Test duplicate retest submission, an unsuccessful retest and an unanswered request. Ask classmates to identify the next action and update time without explanation, and check that every response survives reopening the app.

**Main work and limits.** Clear language and consistency across advisor/customer views matter more than elaborate visuals. A second portal may duplicate existing Spark capabilities; the group must explain the incremental contribution. A role selector only simulates separate users. Prefer C2 if the team has limited implementation time and can show a convincing communication/verification journey.

### C3 Fibre Intake and Routing — alternative explanation

**Business value.** Reduce incomplete referrals and avoidable rerouting by helping an advisor retain existing context and identify missing evidence. This addresses H1/H2 rather than presuming that H3 dominates. [E1, Section 14; E3, P6]

**Example use.** The advisor records the symptom, known-outage information, checks already performed and the observed result. Explicit demonstration rules suggest home-network guidance, specialist review or partner review. The advisor sees the reason, can choose “Insufficient evidence,” and records a reason when overriding the suggestion.

**Prototype scope:** four views—intake, completed-check history, route review, and saved referral summary. Limit the prototype to approximately six synthetic decision cases. Preserve prior evidence so a user does not have to repeat the same input.

**Implementation and verification.** Use transparent decision rules with an unknown/manual-review outcome. Store the rule version, inputs, suggested route and final decision. Test each rule against a predefined answer key, including contradictory inputs and missing evidence. Two group members should review the answer key before implementation.

**Main work and limits.** Authoring defensible rules and exceptions is the main burden. Matching a synthetic answer key only verifies the implemented logic; it does not establish real fault-diagnosis accuracy. Use reviewed rules rather than an LLM-generated fault diagnosis. Reject C3 if the team cannot explain the rules without inventing Spark policies or claiming to perform actual connection tests.

### C4 Fibre Episode Review — closest to the immediate A2 stage

**Business value.** Help an analyst find incomplete case histories and record evidence for competing explanations before choosing an intervention. The value is a more defensible stop, adapt or proceed decision. This closely follows A2's six-week diagnosis. [E3, Sections 3–5]

**Example use.** An analyst opens a synthetic episode with referral, acceptance and restoration events. The app detects acceptance before referral or missing restoration evidence. Correcting a clearly labelled demonstration record updates the completeness result and eligible durations. The analyst records evidence for and against H1–H4 and a review disposition.

**Prototype scope:** four views—episode list, event review, evidence assessment, and decision summary. Use 10–12 seeded cases with normal, invalid, incomplete and unresolved records. Keep data entry manual; CSV import, process mining and statistical causal analysis are extensions.

**Implementation and verification.** Validate required events and timestamp order, calculate only supported durations, and save the human review. Show missing/pending values separately from zero. Reconcile every result against a small hand-calculated fixture set. The app must update its results when a record changes; a static dashboard is insufficient.

**Main work and limits.** Data definitions and honest denominators are harder than the screens. A completeness score cannot establish H3 or choose an intervention automatically. This option also has the greatest **rationale risk**: a diagnostic tool supports the engagement, while A3 asks for implementation of a selected solution. Confirm that this framing is acceptable before choosing it.

## 4. Recommended C1 functional design

### One complete journey

The work queue answers three questions: **Who is accountable? Who needs to act? What happens next?** Episode detail keeps the symptom summary, previous checks, separate Spark and partner owners, and a chronological history together.

| Current state | Action and validation | Saved result |
| --- | --- | --- |
| Draft | Submit only with a Spark owner, symptom summary, completed checks and proposed recipient. | Awaiting acceptance; retain submission time and referral content. |
| Awaiting acceptance | Partner requests more information and states what is missing. | Needs information; Spark owner remains accountable. |
| Needs information | Advisor supplies the requested detail and resubmits. | Awaiting acceptance; preserve earlier attempts and timestamps. |
| Awaiting acceptance | Partner accepts with a named technical owner. | In progress; record acceptance and distinguish the two ownership roles. |
| In progress | Record a repair report and technical retest evidence. | Awaiting verification; a repair report alone does not establish stable recovery. |
| Awaiting verification | Record successful technical retest and a simulated customer confirmation. | Verified restoration; save the evidence and time. |
| Awaiting verification or Verified restoration | Record failure or renewed instability. | Reopened/review required under the same episode ID; retain previous history. |
| Reopened/review required | Advisor reviews retained evidence and prepares a revised referral. | Draft referral under the same episode; the next submission begins a new attempt without erasing the earlier outcome. |

“Overdue review” is a flag, not a replacement workflow state. “Unable to contact/test” remains visible and unresolved. A2 allows customer confirmation **where obtainable**, subject to a service-owner-approved restoration rule; the student prototype should leave such an exception pending rather than invent an automatic closure rule. [E3, Section 3]

### Minimum data and implementation boundary

| Record | Minimum information | Purpose |
| --- | --- | --- |
| Episode | Synthetic ID, symptom, region/partner label, Spark owner, state, next action | Persistent case context. |
| Referral attempt | Attempt ID, required checks, recipient, sent/response times, response reason, technical owner | Separate sending from acceptance and preserve rework. |
| Verification | Technical retest result, customer response, observed times, reopen reason | Distinguish repair, confirmation and continuing uncertainty. |
| History event | Event ID, episode ID, action, simulated actor, timestamp, explanation | Explain what changed; this is a demonstration history, not a tamper-proof audit system. |

For a small single-device version, these logical records may be nested inside one saved episode. The prototype should save the state and its new history entry together where the chosen storage supports it, prevent double submission, and show success only after persistence succeeds. Multi-user concurrency and server-enforced access control require a different implementation scope.

**Must work:** one complete normal journey, the missing-information loop, an overdue case, failed/unavailable verification, persistence and repeatable sample-data setup.

**Optional after those pass:** filtering by next action, a compact summary of pending acceptances, and a printable case summary. Cut these first if time is tight.

**Outside this prototype:** live Spark/Nokia/LFC connections, automatic network diagnosis, real customer identifiers, SMS/email sending, production authentication, contract SLAs, a national operations dashboard, payment or savings automation, and integration with every SAP product discussed in A2.

## 5. Feasible platform paths

The group should settle the course platform conflict before construction. This decision changes the implementation and estimate, but the proposed users, records and acceptance tests remain usable in either path.

| If the lab confirms… | Proposed construction | First feasibility check |
| --- | --- | --- |
| **SAP Build Apps/AppGyver** | Forms and lists bound to data variables; conditional flow logic; on-device storage for synthetic episodes; page/app variables for temporary selections. | Create, update, reload and retrieve one sample case; then verify the required project export/import workflow. |
| **SAP Build Code** | Use the lab-provided starter and the taught Fiori/SAPUI5 and CAP pattern where applicable. Put state checks in the appropriate service layer if a backend is included. | Run the starter, save and retrieve one sample case, and establish the required packaging/deployment route before estimating remaining work. |

SAP documents on-device storage as local to a device/browser and available without a backend. It therefore supports a contained demonstration, but it does not synchronise a Spark screen on one computer with a partner screen on another. Browser sharing also shares that storage. Demonstrate the roles sequentially on one device unless shared persistence is deliberately added. [T2]

SAP's data variables support schema-bound page data, while flow functions provide actions such as record creation/update and conditional logic. Their availability in the supplied course tenant still needs verification. [T3–T4] SAP Build Code supports CAP, Fiori and SAPUI5 development and is not simply another label for the Build Apps visual editor. [T1]

**Packaging proposal:** keep reproducible seed data within the deliverable setup and document how to load it. Do not assume a project ZIP contains browser-local records. Later, rehearse importing/opening the submitted artifact in a clean course-approved environment and executing the complete journey. A screen recording is a backup demonstration aid, not a replacement for the functional submission.

## 6. Design and validation

### Design Thinking evidence

| Stage | Proposed activity | Evidence to retain |
| --- | --- | --- |
| Empathise | Revisit the A1 journey and use classmates to act out advisor, customer and partner situations. Do not contact Spark employees. | Source-based pain points and separately labelled roleplay observations. |
| Define | Select one user problem, such as difficulty identifying the next responsible action on a referral. | One problem statement, process boundary and success criterion. |
| Ideate | Compare C1–C4 with the other group members' candidates. | Effort–impact comparison, rejected alternatives and reasons. |
| Prototype | Build the smallest complete selected workflow after selection. | Screen flow, state rules and working demonstration. |
| Test | Run predefined normal and exception cases, followed by a small peer usability exercise. | Results, observed confusion, revisions and a retest. |

Apply the rubric's usability reference through visible status and timestamps, familiar language, explanations of unavailable actions, preserved input after errors, and consistent navigation. Use text alongside colour, readable contrast, labelled controls and keyboard-accessible interactions. These are design applications of the cited heuristics, not a claim that accessibility compliance has been tested. [T5]

### C1 acceptance cases

| Test | Expected observable result |
| --- | --- |
| T01 — Incomplete referral | Submission is blocked with field-specific guidance; entered information remains. |
| T02 — Information request and resubmission | Same episode and Spark owner; both referral attempts remain visible. |
| T03 — Explicit acceptance | Named partner owner and timestamp persist; submitting a referral alone never counts as acceptance. |
| T04 — Overdue/pending | Review flag appears using the configured demonstration time; missing acceptance is not displayed as zero delay. |
| T05 — Repair without verification | Repair report leads to verification, not immediate verified restoration. Failed or unavailable tests remain unresolved. |
| T06 — Reopening | Same episode re-enters review; earlier restoration and referral history remain available. |
| T07 — Failed save or repeated click | No misleading success message and no duplicate acceptance/history event; user can recover. |
| T08 — Reload and clean setup | Saved case is recoverable; the exported project can initialise demonstration data and repeat the journey. |

For each candidate, run its corresponding normal path, exception path and persistence test. Proposed prototype release criteria are **all critical functional tests passing and no known blocker preventing completion of the selected journey**. For formative usability, invite around five classmates who did not implement the tested screen, subject to course guidance. Aim for at least four to complete the central task without coaching and correctly explain the next action. This small convenience sample reveals usability problems; it cannot represent Spark employees or establish business impact.

### What can and cannot be concluded

| Evidence level | Possible conclusion | Remaining boundary |
| --- | --- | --- |
| Synthetic functional tests | State rules and calculations match the defined fixtures. | The fixtures are invented, not Spark performance data. |
| Peer roleplay/usability | Participants could or could not use and understand the prototype. | Peers are proxy users; improvement against real practice is unverified. |
| Hypothetical future authorised pilot | With suitable linked records and a comparison design, assess service outcomes and added handling effort. | This is outside A3 and cannot be undertaken by contacting company staff under the current course rule. |

A later professional evaluation could use A2's K1 restoration time, K2 recontacts, K3 routing accuracy and K4 referral-to-acceptance delay. Preserve unresolved/missing outcomes and seven-day reopening follow-up. The proposed 15% restoration/recontact reductions and other A2 thresholds remain conditional planning targets. Do not claim them from a short app demonstration. [E3, Table 1; E4, slide 7]

For C1's sample calculation, show accepted-referral delay separately from still-pending elapsed time and unknown data. Preserve the first submission and resubmissions so retries cannot make the displayed end-to-end delay artificially shorter. Do not turn a handful of demonstration cases into a persuasive P90 benefit chart.

## 7. Workload and delivery plan

The indicative C1 allocation below totals **70–100 person-hours**. Four students would each contribute roughly 18–25 hours if work were evenly distributed, although actual contribution must be recorded rather than assumed.

| Work package | Team hours | Completion evidence |
| --- | ---: | --- |
| Source reconciliation, selection and platform check | 6–8 | Agreed candidate, recorded assumptions and a viable course environment. |
| User journey, screens and sample cases | 8–12 | Reviewed flow and test fixtures. |
| Data persistence and core workflow | 20–28 | Normal journey and information-request loop work. |
| Verification, reopening and error handling | 10–14 | Exception tests pass. |
| Peer testing, fixes and accessibility review | 10–14 | Observation log and retest. |
| Pitch, packaging and clean-environment rehearsal | 8–12 | Five-minute rehearsal and repeatable artifact. |
| Contingency | 8–12 | Reserved for platform or integration defects. |

These estimates assume the taught platform is already accessible. Build Code setup, an unfamiliar backend, real authentication or shared multi-device use could materially exceed them. If the first persistence/packaging exercise takes more than one working session, revise the estimate and remove extensions before committing.

**Suggested sequence:** use 23–27 September to resolve requirements and select the candidate; 28 September–4 October for the normal journey; 5–11 October for exceptions and peer testing; and 12–16 October for fixes, packaging and pitch rehearsal. Treat later days as contingency while the published deadline conflict is resolved. These are proposed dates, not course milestones.

Allocate responsibilities by output: one member owns evidence and process rules, one owns interaction design and usability, one owns data/workflow integration, and one owns testing and the pitch package. Everyone should understand the whole demonstration. Record actual work and lab participation for the final contribution slide; the template's four name slots do not establish the team's current membership or equal contributions. [E8]

## 8. Comparison method for later Agent use

### Provisional effort–impact assessment

“Impact” below means **potential benefit if the proposed mechanism is real**. Effort is relative classroom implementation effort under the shared assumptions. These placements are planning judgments, not measured results.

| Candidate | Potential impact | Relative effort | Principal uncertainty | Reason to shortlist or reject |
| --- | --- | --- | --- | --- |
| C1 | Medium–high on ownership visibility and avoidable handoff waiting | Medium | Is unclear acceptance actually a material source of delay? | Shortlist for a clear P1 demonstration; reject a scope requiring real partner integration. |
| C2 | Medium on customer understanding and repeat contact | Low–medium | Does it add value beyond existing updates? | Shortlist for a smaller complete journey; reject if it merely displays static statuses. |
| C3 | Medium–high if misrouting is material | Medium | Are credible routing rules available? | Retain as an H2 alternative; reject unsupported diagnostic claims. |
| C4 | Medium enabling value for diagnosis and investment decisions | Low–medium | Will the diagnostic-tool rationale satisfy A3's solution requirement? | Retain for A2 continuity; reject a dashboard with no functional evidence-review action. |

Before scoring, apply eligibility gates: explicit A1/A2 traceability; acceptable A3 rationale; required SAP platform; at least one complete working feature; usable sample data without prohibited company contact; and a credible five-minute demonstration within the team's capacity. A high weighted score cannot compensate for a failed gate.

Then assess **expected demonstrability** against the actual rubric weights: rationale 5, design 15, functionality 30, usability 25 and presentation 25. Score each dimension from 1 to 5 and calculate `sum(weight × score / 5)`, giving a total out of 100. Each score needs a source or design-based reason and a confidence label. It is a selection aid, not a predicted grade.

Record technical dependency risk and estimated hours separately. Re-rank under reduced capacity and under both possible SAP environments. Prefer the simpler candidate when plausible assumptions reverse a narrow score advantage. Compare this operational route fairly with other members' candidates; do not reward it merely because this document describes it in more detail.

### Reusable comparison prompt

```text
Compare the attached A3 candidate proposals for our INFOSYS 704 group.
This is a planning review only. Do not develop, deploy, contact company
employees or manufacture validation evidence.

First establish the latest requirements and preserve unresolved source
conflicts. Use Ryan's latest A2 direction: diagnose competing causes,
then choose the smallest justified intervention. H3 is unproven.

For every candidate, report:
1. The business need and explicit A1/A2 source connection.
2. The primary user, complete workflow and one working feature.
3. Facts, assumptions, unknowns and unsupported claims.
4. Eligibility against the platform, data, scope and demonstration gates.
5. The minimum prototype, implementation dependencies and effort range.
6. Functional tests, usability tests and limits on business conclusions.
7. Scores using the A3 weights 5/15/30/25/25, with reasons and confidence.
8. What would make you reject the candidate or change the ranking.

Compare candidates on equivalent evidence and scope. Do not infer client
approval, internal Spark processes, APIs, SLAs, savings or test results.
Do not treat missing evidence as proof of failure or silently fill gaps.
Run a sensitivity comparison for reduced team capacity and the confirmed
SAP platform. Return a recommended shortlist, material disagreements,
and decisions the group must make. Keep human selection and the course's
AI-use rules explicit; this is not submission-ready assessed content.
```

## 9. Five-minute C1 demonstration proposal

| Time | Content | Purpose |
| --- | --- | --- |
| 0:00–0:35 | **Situation:** A2's bounded residential fibre episode and continuing Spark accountability. | Establish client-specific context. |
| 0:35–1:00 | **Complication:** Ownership/acceptance uncertainty is a hypothesis; a case needs a visible next action. | Explain the chosen mechanism without asserting an internal finding. |
| 1:00–3:30 | **Resolution:** Submit `F-104`, request information, resubmit and accept. Show persisted history, then use a prepared case to demonstrate failed verification/reopening. | Demonstrate real state changes and an exception. |
| 3:30–4:10 | Explain one usability revision and show the corresponding test result, once performed. | Demonstrate Design Thinking and validation. |
| 4:10–4:40 | Explain expected value, added workload risk and what a future authorised pilot would need to establish. | Separate functionality from business impact. |
| 4:40–5:00 | State the bounded next decision and display the completed groupwork disclaimer. | Close within the time limit and meet the stated presentation requirement. |

Use a small number of supporting slides and spend most of the time in the application. The prototype should visibly identify its synthetic dataset and simulated partner role. Source credits should accompany factual claims; genuine test results can replace proposed targets only after testing.

## 10. Source register

Local file citations establish the content of the inspected coursework. Canvas links require course access. Public company figures in A1/A2 were not independently re-audited in this task; they are used here to preserve the route and its limitations, not to make new claims about current Spark performance.

- **[E1] A1-D1 report:** Ryan Li — Spark NZ Operational Analysis (source file: `Ryan_Li_ali409_INFOSYS704_A1-D1.docx`; not bundled), dated 10 August 2026; especially Sections 8–15.
- **[E2] A1-D2 report:** Ryan Li — Designing Analysis and Interpreting Results (source file: `Ryan_Li_ali409_INFOSYS704_A1-D2.docx`; not bundled), dated 27 August 2026; especially Sections 6–9 and the TO-BE explanation.
- **[E3] A2-D1 report:** Ryan Li — Consulting Proposal (source file: `Ryan_Li_ali409_A2_D1.docx`; not bundled), dated 17 September 2026; Sections 1–6, 9–11, Tables 1–2 and Figure 4.
- **[E4] A2-D2 final local artifacts:** Business Case slides (source file: `Spark_NZ_A2D2_Business_Case_Final.pptx`; not bundled) and English speaking script (source file: `Spark_NZ_A2D2_English_Speaking_Script_Final.docx`; not bundled); slides 4–10 and 16–17, plus supporting explanations. Submission status was not verified.
- **[E5] Current Canvas assignment:** [A3 Build Code](https://canvas.auckland.ac.nz/courses/143335/assignments/510627), overview, deadline and rubric; inspected 23 September 2026.
- **[E6] A3 specification V1:** [Canvas file preview](https://canvas.auckland.ac.nz/courses/143335/files/folder/Assignment%20resources/Assignment%20Specifications?preview=18240038), pp. 1–2; checked against the local PDF. The live folder showed V1, last modified 23 August 2026. Local source: `704_A3_2026 Build App_Specificatication and Marking Criteria_V1.pdf` (not bundled).
- **[E7] Week 8 lab slides:** [INFOSYS 704 Lab 8 Content V1](https://canvas.auckland.ac.nz/courses/143335/files/18852260?module_item_id=3076034), especially slides 6–8; inspected 23 September 2026. Some embedded links point to an older course, so this proposal uses the current course's assignment/file pages.
- **[E8] Group participation:** [Week 8 announcement](https://canvas.auckland.ac.nz/courses/143335/discussion_topics/1645073) and [Groupwork Management Slide](<../resources/templates/Groupwork Management Slide.pptx>), slide 1.
- **[E9] Course evidence and AI rules:** [Week 3 announcement](https://canvas.auckland.ac.nz/courses/143335/discussion_topics/1645079) and [Week 6 announcement](https://canvas.auckland.ac.nz/courses/143335/discussion_topics/1645076), read in the current course announcement listing on 23 September 2026. A focused Ed search for A3 returned a group-formation thread, with no platform/deadline clarification in those search results; this was not an exhaustive policy audit.
- **[T1] SAP platform distinction:** [What is SAP Build Code](https://help.sap.com/docs/build_code/d0d8f5bfc3d640478854e6f4e7c7584a/504854f457cc4fbf9f79136dbc773618.html) and [About SAP Build](https://help.sap.com/docs/build-work-zone-standard-edition/sap-build-work-zone-standard-edition/integration-with-sap-build).
- **[T2] SAP storage:** [On-Device Data Storage](https://help.sap.com/docs/build-apps/service-guide/on-device-data-storage).
- **[T3] SAP binding:** [Data Variables](https://help.sap.com/docs/build-apps/service-guide/data-variables).
- **[T4] SAP behaviour:** [Flow Functions](https://help.sap.com/docs/build-apps/service-guide/flow-functions).
- **[T5] Usability reference linked by the A3 specification:** [Nielsen Norman Group — 10 Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/).

Public technical references were checked on 23 September 2026. Documentation supports capability feasibility; it does not verify the course tenant, a working prototype or institutional permission to use a particular AI tool.
