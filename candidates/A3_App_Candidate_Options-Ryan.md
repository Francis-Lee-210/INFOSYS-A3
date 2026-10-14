# A3 App Candidate Options

> **Repository preparation — 14 October 2026:** This is an individual candidate proposal dated 23 September 2026, not a recorded team decision. Current [V3 requirements](../作业要求.md) specify **OpenCode.ai + SAP APIs**. Build Apps/AppGyver/Build Code sections and their effort estimates below are retained as historical planning; API fit and revised implementation effort require validation. Local-only A1/A2 evidence is identified by source filename and is not bundled.


## Verified Knowledge Handover at Spark New Zealand

**Purpose:** Provide the group with a set of feasible SAP Build Apps prototype options based on the A1 and A2 route and the latest A3 requirements. This document supports concept selection only. Development has not started.

## 1. Decision Summary

The group should compare Candidate A and Candidate B first.

- **Primary recommendation:** Candidate A, Knowledge Handover Gate
- **Delivery-safe alternative:** Candidate B, Receiver Verification and Remediation
- **Low-risk fallback:** Candidate C, Knowledge Criticality Triage

Candidate A offers the strongest alignment with the approved A2 proposal and the A3 rubric. Candidate B preserves the central receiving-side competence check while reducing the number of screens, roles and application states.

### Recommended MVP

If the group selects Candidate A, the prototype should demonstrate one fictional Connectivity case. A user should be able to:

1. Assess whether the role is knowledge-critical.
2. Assign a receiving owner.
3. Complete a short handover pack.
4. Record the results of two competence tasks.
5. Reach either verified completion or remediation.

### Scope Boundary

| Include | Exclude |
|---|---|
| One fictional case and one primary journey | Authentication and user administration |
| Local variables and a small local collection | Live HRIS, ITSM, identity or finance integrations |
| Input validation and conditional routing | Real employee information |
| Pass and remediation outcomes | File uploads, email notifications and advanced analytics |

## 2. Evidence and Constraints

### A1 and A2 Route

The original A1 files are not available in the folder. This proposal therefore uses A1 findings only where they are repeated in A2-D1.

A2-D1 states that Spark's administrative exit process controls payroll, assets and access but does not require evidence that operational knowledge has reached the receiving team. It recommends a gated process for knowledge-critical exits with the following controls:

- Criticality assessment
- A named receiving owner
- A standard handover pack
- A competence check based on real work
- Remediation or an approved exception
- KPI and exception reporting

Security offboarding must remain separate. A failed knowledge check must not delay access revocation.

### Measures from A2-D1

| Measure | Meaning | A2 proposal target |
|---|---|---|
| VHCR | Critical exits verified before the final working day | 90% by week 52 |
| CAC | Exits assessed for criticality within five working days | 100% by week 32 |
| HVLT | Working days between verification and the final working day | At least five days |
| Capability recovery cost | Rework and unplanned contractor cost linked to critical exits | NZD 1.4 million annual run-rate reduction after validation |
| 90-day reopen rate | Knowledge-related escalations after an exit | 25% below the validated baseline |

These are proposed targets, not confirmed Spark results. The A2-D1 proposal states that Spark data must validate them.

### A3 Requirements

| Criterion | Weight | Implication for selection |
|---|---:|---|
| App rationale | 5% | The chosen app must trace directly to an approved A2 solution. |
| App design | 15% | The app should apply Design Thinking and use client-specific process language. |
| App functionality | 30% | At least one feature must work. Static mock-ups are insufficient. |
| App usability | 25% | The path must be logical, smooth and recoverable when users make errors. |
| App presentation | 25% | The five-minute pitch must use Situation, Complication and Resolution. |

### Items to Confirm

- The formal specification names SAP Build Apps and AppGyver, while the Canvas rubric extract refers to SAP Build Code Development Guidelines.
- The two A3 documents display different submission times.
- A2-D2 and the Effort-Impact Matrix are not available, so the group must confirm which solution received final approval.
- The team must confirm access to the SAP environment and the amount of lab support available.

## 3. Candidate A: Knowledge Handover Gate

### Recommendation

Candidate A has the highest A3 potential because it converts the approved A2 process into one coherent app journey. Its main risk is excessive scope, so the prototype must use one case and a small number of fields.

### Purpose and Users

The app guides a knowledge-critical exit from initial assessment to receiving-side verification.

Potential users are:

- Line manager
- Departing employee
- Receiving owner
- Process owner

The prototype does not require separate authentication for each user. A role selector can demonstrate the different perspectives.

### Business Value

The app creates visible evidence that the receiving owner can continue the work. It identifies incomplete handovers before departure and provides a defined remediation route. These controls address the process gap described in A2-D1 without delaying security offboarding.

### Prototype Journey

1. Open a fictional Connectivity exit case.
2. Complete a short criticality assessment.
3. Assign the receiving owner and target verification date.
4. Review four required handover items.
5. Record the result of two competence tasks.
6. Route the case to `Verified` or `Remediation Required`.
7. Review the status, evidence and next action on the case summary.

### Minimum Working Feature

The competence check changes the case status and controls the next screen.

```text
All required tasks passed
    -> Verified

One or more tasks failed
    -> Remediation Required
```

A passing result opens the verified summary. A failed task opens a remediation screen with a named action and due date. This is the core functional proof for the demonstration.

### State Model

| State | Entry condition | Available action | Next state |
|---|---|---|---|
| Draft | Case opened | Complete criticality assessment | Critical or Standard |
| Critical | Criticality rule triggered | Assign receiver and prepare the pack | Ready for Verification |
| Ready for Verification | Required items complete | Record competence results | Verified or Remediation |
| Remediation Required | One or more tasks failed | Complete the missing action | Ready for Verification |
| Verified | All required tasks passed | View summary | Closed for prototype |

### Screen Plan

| Screen | User task | Required behaviour |
|---|---|---|
| Home | Understand the case and begin | Show the scenario, current status and one primary action. |
| Criticality Assessment | Answer risk questions | Validate required answers and explain the result. |
| Handover Plan | Assign the receiver and review evidence | Prevent progression until required fields are complete. |
| Receiver Verification | Record two task outcomes | Calculate the outcome and preserve comments. |
| Remediation | Review the failed task and next action | Return to verification after the action is complete. |
| Case Summary | Confirm status and evidence | Display status, dates, evidence and the next owner. |

### Implementation Approach

- Store the current case, answers, checklist items and verification status in app variables or a local collection.
- Use page validation before navigation.
- Use conditional visibility for explanations and remediation actions.
- Seed one fictional case and label all information as demonstration data.
- Keep security offboarding outside the app workflow.
- Display a notice that access revocation continues independently.

### Validation

| Test | Expected result |
|---|---|
| Non-critical case | The app records the result without opening the enhanced handover path. |
| Critical case with no receiver | The app blocks progression and identifies the missing field. |
| Incomplete handover pack | Verification remains unavailable. |
| All competence tasks passed | The case becomes `Verified`. |
| One task failed | The case becomes `Remediation Required`. |
| Return after remediation | The user can complete verification without losing prior entries. |

### Effort and Limitations

Estimated effort is **24 to 32 group person-hours**, assuming basic SAP Build Apps experience.

The prototype will not:

- Integrate with Spark production systems
- Use real employee data
- Prove that submitted knowledge is factually accurate
- Calculate confirmed financial benefits

It demonstrates the proposed control and user journey using fictional data.

## 4. Candidate B: Receiver Verification and Remediation

### Concept

Candidate B concentrates on the receiving-side competence check. It is the strongest alternative when the team needs a smaller build without abandoning the central A2 control.

### Business Value and Journey

A receiving owner opens an assigned case, reviews the handover evidence, attempts two or three work-based checks and records the outcome. The app then confirms verification or produces a remediation plan.

| Element | Prototype scope |
|---|---|
| Primary user | Receiving owner |
| Working feature | Task scoring and conditional routing to `Verified` or `Remediation Required` |
| Screens | Assigned case, evidence review, competence check, result and remediation |
| Data | One fictional case stored locally |
| Estimated effort | 16 to 22 group person-hours |

### Validation

- Confirm that users understand what each task checks.
- Confirm that the result explains why the case passed or failed.
- Confirm that users can find the next remediation action without assistance.
- Test that prior responses remain available after users return from remediation.

### Limitations

This option does not demonstrate the initial criticality assessment or case initiation. It covers less of the approved process, although it gives the group more time to improve usability and presentation.

## 5. Candidate C: Knowledge Criticality Triage

### Concept

Candidate C is a manager-facing wizard that classifies an exit and generates the required handover actions. It offers the lowest implementation risk among the main options.

| Element | Prototype scope |
|---|---|
| Working feature | Rules-based classification with an explanation and generated action list |
| Inputs | Role dependency, system ownership, access, tenure and concentration of knowledge |
| Outputs | Provisional classification, reasons, required actions and due date |
| Estimated effort | 12 to 18 group person-hours |
| Main limitation | The rules have not been validated with Spark and the app does not prove successful handover |

### Validation

Create test cases for obvious low-risk, borderline and high-risk scenarios. Confirm that identical inputs always produce the same classification and that users understand the reason for the result.

## 6. Candidate D: Guided Handover Pack Builder

### Concept

Candidate D helps a departing employee create a consistent handover pack and allows the receiver to request missing information. A dynamic coverage indicator is the main working feature.

| Area | Proposal |
|---|---|
| Journey | Select knowledge categories, enter recurring tasks and current issues, review privacy warnings, then submit for acceptance or revision. |
| Business value | Improves consistency and makes the receiver's information needs visible before departure. |
| Estimated effort | 16 to 24 group person-hours |
| Limitations | A completed form does not prove competence. File uploads could add avoidable risk. |

## 7. Candidate E: Handover KPI and Exception Hub

### Concept

Candidate E gives the process owner a dashboard for fictional VHCR, CAC and HVLT data. Users can filter cases, open an exception and assign remediation.

| Area | Proposal |
|---|---|
| Working feature | Filter cases, update an exception owner and save the new status. |
| Business value | Makes incomplete handovers and recurring control failures visible. |
| Estimated effort | 18 to 26 group person-hours |
| Limitations | The group lacks production data. A mostly static dashboard may appear weak against the functionality criterion. |

Candidate E is better used as an optional summary screen within Candidate A than as the main A3 app.

## 8. Candidate Comparison

The following scores are planning judgements, not predicted grades. They apply the published A3 weights to a five-point assessment of each candidate.

| Candidate | Rationale | Design | Functionality | Usability | Presentation | Indicative fit | Delivery risk |
|---|---:|---:|---:|---:|---:|---:|---|
| A. Knowledge Handover Gate | 5.0 | 5.0 | 5.0 | 4.5 | 5.0 | 97.5/100 | Medium |
| B. Receiver Verification | 4.5 | 4.5 | 4.5 | 5.0 | 4.5 | 92.5/100 | Low |
| C. Criticality Triage | 4.0 | 4.5 | 4.0 | 4.5 | 4.5 | 86.5/100 | Low |
| D. Handover Pack Builder | 4.0 | 5.0 | 4.0 | 4.0 | 4.5 | 85.5/100 | Medium |
| E. KPI and Exception Hub | 4.0 | 4.5 | 3.5 | 4.0 | 4.5 | 81.0/100 | Medium |

### Decision Rules

| Team condition | Preferred candidate |
|---|---|
| The team can implement shared state and conditional routing reliably | Candidate A |
| The team has limited time or platform experience | Candidate B |
| The team needs the simplest dependable working feature | Candidate C |
| The group wants a dashboard | Add a small KPI summary to A after the core path works |

### Questions for Agent Comparison

1. Which candidate traces most directly to the solution approved in A2-D2?
2. Which candidate can the current team complete and test within the available lab time?
3. Which option demonstrates the strongest working feature in less than two minutes?
4. Which option has the fewest dependencies on unavailable data or integrations?
5. Which option creates the clearest Situation, Complication and Resolution presentation?

## 9. Design and Validation Plan

### Design Thinking Evidence

| Stage | Evidence to produce |
|---|---|
| Empathise | Summarise the A2 concerns of managers, departing employees, receiving owners and the process owner. |
| Define | State the problem as the absence of receiving-side evidence that work can continue. |
| Ideate | Record why the group selected one candidate from this option set. |
| Prototype | Build one realistic case with one complete decision path and one failure path. |
| Test | Run task-based usability tests and business-rule tests, then record the changes made. |

### Usability Principles

- Show one primary action per screen and keep the current case status visible.
- Use language from the A2 process, including receiving owner, competence check, verified and remediation required.
- Validate required information before navigation and explain how to correct an error.
- Allow users to return without losing earlier entries.
- Confirm status changes and explain the next owner and action.
- Keep contrast, type size, labels and touch targets consistent.

### Prototype Test Record

| Test area | Evidence | Suggested acceptance condition |
|---|---|---|
| Business rules | Test case log | All defined paths produce the expected status. |
| Navigation | Observed task completion | No dead end exists in the primary or remediation path. |
| Comprehension | Participant explanation | Users can explain the final status and next action. |
| Error recovery | Observed correction | Users can fix missing information without restarting. |
| Presentation reliability | Repeated demo runs | The complete demo works consistently without manual repair. |

## 10. Five-Minute Presentation Plan

| Time | Purpose | Content |
|---|---|---|
| 0:00–0:40 | Situation | Spark relies on knowledge-intensive technical and customer-facing roles. |
| 0:40–1:15 | Complication | Administrative offboarding can finish without evidence that the receiving team can continue the work. |
| 1:15–1:40 | Resolution | Introduce the selected app and explain the selection decision. |
| 1:40–3:50 | Demonstration | Run one case from initial action to verified completion or remediation. |
| 3:50–4:25 | Validation | Explain the Design Thinking evidence and usability tests. |
| 4:25–4:50 | Value and limitations | State the expected value, assumptions and prototype boundaries. |
| 4:50–5:00 | Recommendation | State the next implementation decision. |

### Presentation Evidence

- Use one seeded case so the live demonstration remains repeatable.
- Show the working state change instead of explaining every screen.
- Keep a short backup recording or screenshot sequence in case the environment fails, subject to course rules.
- Append the supplied Groupwork Management Disclaimer slide after the presentation content.

## 11. Assumptions and Source Notes

### Working Assumptions

| Assumption | Effect if incorrect |
|---|---|
| A locally stored prototype is acceptable | The group may need to add a supported data service or revise the design. |
| The approved A2 solution is the verified knowledge handover route | The candidate set must be re-scored against the solution approved in A2-D2. |
| The group can use fictional Spark scenarios | The demonstration data and narrative may need lecturer approval. |
| The team has basic SAP Build Apps experience | Effort estimates will increase and Candidate B or C may be safer. |
| A working decision path carries more value than several static screens | The group may need to rebalance visual breadth and functional depth. |

### Sources Reviewed

- A2-D1 Consulting Proposal (source file: `A2-D1_Consulting_Proposal.docx`; not bundled), especially pages 3–10, 15 and 21
- A3 Specification and Marking Criteria (source file: `704_A3_2026 Build App_Specificatication and Marking Criteria_V1.pdf`; not bundled), pages 1–2
- A3 Build Code Canvas Extract (source file: `A3 Build Code.pdf`; not bundled), pages 1–3
- [Groupwork Management Disclaimer](<../resources/templates/Groupwork Management Slide.pptx>)

### Items Not Available

- Original A1 submissions
- A2-D2 Business Case Presentation
- The Effort-Impact Matrix used for the approved solution
- Lecturer clarification resolving the platform and deadline wording

## 12. Final Position

Candidate A offers the best alignment with the verified knowledge handover route and the A3 rubric when the group keeps the strict MVP boundary. Candidate B is the strongest contingency because it preserves the receiving-side competence check while reducing the number of screens, roles and application states.

The group should therefore compare **Candidate A and Candidate B first**, with Candidate C available as the low-risk fallback.
