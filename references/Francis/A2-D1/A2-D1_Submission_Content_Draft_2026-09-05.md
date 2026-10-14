# Consulting Proposal: PlanFit Navigator Core

**Prepared for:** Spark New Zealand Limited  
**Prepared by:** Francis Lee (`tli174`)

# 1. Executive Summary

Approve Phase 0 only, capped at **NZ$120,000**: NZ$50,000 in consulting fees and up to NZ$70,000 in Spark/third-party delivery allowance. This diagnostic will test the customer mechanism and data feasibility before further investment.

Spark group connection share fell from 42% in June 2022 to 38% in June 2025 (Commerce Commission, 2026, p. 216). Retention warrants attention, while the internal causes of customer loss require investigation. Public documentation does not show how the consumer plan-review journey consistently delivers a clear plan-fit conclusion.

PlanFit Navigator Core would add a rule-based MySpark recommendation to keep the current plan or choose an eligible better-fit Spark plan, with reasons, information correction and human help. This non-upsell guidance supports SPK-30's customer-experience priority. A controlled pilot would isolate the explanation change, targeting a 15% relative reduction in all qualifying 90-day voluntary churn and 60% successful review-output delivery, subject to financial and trust guardrails. The 20% reference for explicit treatment-recommendation acceptance is diagnostic.

The proposed 39-week engagement runs from **5 October 2026 to 30 June 2027**. Five consultants would deliver validation, discovery, design, build, pilot and handover with Spark's accountable owners. Phased implementation, training and knowledge transfer would support adoption; customer exposure requires approved data, suitability, integration and privacy controls.

The provisional NZ$2.000m budget includes NZ$0.420m in fees and NZ$1.580m in delivery allowance. Assuming one-year benefit persistence and cashable contact capacity, three-year net present value (NPV) is **−NZ$1.114m**, benefit–cost ratio (BCR) **0.70** and return on investment (ROI) **−21.5%**. Phases 0–4 would expose up to NZ$1.920m before the causal readout, supporting the limited diagnostic. Phase 1's NZ$280,000 requires separate M1 approval under Table 6. Phase 2 requires updated NPV ≥0 and BCR ≥1, validated baselines, adequate power and controls at M2 (§10.2).

*Reading key:* customer decision-readiness hypothesis (`H1M`); primary retention hypothesis (`H1Q`); baseline churn (`B0`), review-output reach (`B1`), recommendation acceptance (`B2`) and assisted contact (`B3`); proactive timing (`H2`), loyalty/value (`H4`) and broader continuity (`H5`). Table 6 defines the milestone gates (`M0–M7`, including readout acceptance `M6A`). The comparator is the arm that provides equivalent information; "control" in the underlying model labels refers to the same arm. Other abbreviations are expanded at first use.

# 2. Client Context and Problem Statement

## 2.1 Client, position and strategic fit

Spark is a listed New Zealand telecommunications and digital-services company. In FY26 it reported NZ$3,700 million adjusted revenue, NZ$998 million mobile service revenue and NZ$1,035 million adjusted earnings before interest, tax, depreciation, amortisation and net investment income (EBITDAI). Pay-monthly and prepaid connections among Consumer and small and medium enterprise (SME) customers were 1.198 million and 1.072 million, respectively. These figures describe the wider portfolio; consumer plan-review baselines will be established during discovery (Spark New Zealand Limited, 2026a, pp. 4–5, 20–22; 2026c, pp. 3–4, 12).

SPK-30 prioritises core connectivity, simplification, better networks and customer experiences, and financial discipline. Broad Consumer and SME business customer interaction net promoter score (NPS) rose from +40 to +42. Spark announced a transition to Connectivity and Digital Services, with related leadership changes from 10 August 2026. This structure makes Connectivity a plausible home for the proposed engagement, with PlanFit ownership still to be agreed (Spark New Zealand Limited, 2026a, pp. 4–5, 10–11, 21; 2026b; 2026c, p. 7).

Porter and Treacy-Wiersema provide the strategic lenses for this proposal. PlanFit most closely reflects customer intimacy because it uses usage, spend and eligibility to support a tailored decision. Operational excellence contributes through consistent rules and measurement. Product leadership has a smaller role, as the proposal works within existing networks and plan categories (INFOSYS 704 Teaching Team, 2026b, slides 10–11).

## 2.2 External forces and urgency

*Table 1. External forces and proposal implications.*

| External force | Public evidence | Implication |
|---|---|---|
| Competitive pressure | Spark group connection share fell from 42% to 38% between June 2022 and June 2025; June 2025 shares were Spark 38%, One NZ 37%, 2degrees 22% and MVNOs 3% | Retention matters in a closely contested market |
| Value-led alternatives | MVNO subscriptions and visible price competition increase the relevance of transparent value comparison | Network strength alone may not answer each customer's plan-fit question |
| Transparency expectations | Regulator guidance calls for longer usage/spend history, allowance comparison, appropriate-plan prompts and an easy change route | Plan data should be translated into an inspectable decision, not merely displayed |
| Strategic timing | SPK-30 and the Connectivity structure concentrate leadership attention and capital on the core | A named process owner and controlled investment can be aligned now |
| Evidence timing | FY26 mobile revenue improved while connection measures remained pressured | Treat the mixed portfolio evidence as context and keep process baselines as client-data dependencies |

Sources: Commerce Commission (2025, pp. 7–9; 2026, pp. 213–216); Spark New Zealand Limited (2026a, 2026b, 2026c).

## 2.3 Problem and current-state evidence

The process scope is Spark-branded New Zealand individual-consumer pay-monthly and prepaid mobile plan-value review.

The process starts when a customer recognises a possible mismatch or initiates a review. It ends when the customer has enough information to decide whether to stay, change, defer, decline or exit. The scope covers usage and spend visibility, comparison, digital or assisted support and the final decision. It excludes network remediation, Skinny, wholesale/MVNO and enterprise/SME business sales. Internal rules will require validation with Spark.

Spark's public help path documents customer-initiated option browsing and plan change. The regulatory benchmark goes further in describing the support customers need to make a decision (Commerce Commission, 2025, pp. 7–9; Spark New Zealand Limited, n.d.). This comparison identifies the following gap:

> The publicly documented customer-initiated path does not demonstrate a consistent, timely and transparent plan-fit conclusion.

The finding concerns the documented path. WP1.1 will test how it relates to Spark's actual process and investigate the D2–D5 hypotheses below.

*Table 2. Current-process validation hypotheses.*

| ID | Validation hypothesis | Status |
|---|---|---|
| D1 | Usage/spend and options may not become an explicit, non-upsell fit conclusion within the eligible Spark plan set | Public rationale and documented-path gap; internal process validation required |
| D2 | Review may occur after concern or exit intent has hardened | Consulting assumption |
| D3 | Context may be repeated across digital and assisted channels | Consulting assumption |
| D4 | Eligibility, recommendation and save logic may be explained inconsistently | Consulting assumption |
| D5 | Exposure, decision and outcome data may not close one timely learning loop | Consulting assumption outside the current decision boundary |

## 2.4 SMART engagement objective

> By 30 June 2027, validate through a controlled pilot whether improving the Spark-branded individual-consumer mobile plan-value review can reduce all qualifying 90-day voluntary churn by at least 15%, achieve at least 60% successful review-output delivery and assess explicit acceptance of suitability-valid treatment recommendations against a 20% diagnostic reference, without material deterioration in average revenue per user (ARPU), contribution margin or customer trust.

The proposed retention and reach targets, together with the acceptance diagnostic reference, focus the pilot on this process's contribution to customer retention. Wider market-share changes also depend on factors outside the review journey.

The objective is specific to the defined consumer review and cohort, with three measurable thresholds and accompanying guardrails. Its achievability depends on the baseline, statistical power and economic feasibility. It supports SPK-30's customer-experience and retention priorities and sets a deadline of 30 June 2027 for assessing 90-day outcomes.

## 2.5 AS-IS model

![Figure 1. Evidence-bounded AS-IS with pain points and KPI annotations](<Figures/ASIS_Report_2026-09-18.svg>)

*Figure 1. AS-IS model derived from public evidence, with proposed KPI measurement points and baseline gaps. "Neutral" in the process labels refers to the proposed non-upsell orientation within eligible Spark plans. WP1.1 will check current practice.*

The model identifies points where customers may struggle to turn information into a decision or receive inconsistent context and explanations. Its boundary ends at the customer decision. The TO-BE extends this to fulfilment and 90-day measurement. WP1.1 will validate the process, and M2 will confirm `B0–B2` before pilot exposure.

# 3. Objectives and Success Criteria

## 3.1 Objectives

1. Validate the current process and establish auditable `B0–B3` baselines, cohort/exclusion definitions and financial/trust guardrails.
2. Design PlanFit Navigator Core without bundling H2 timing, H4 loyalty or H5 broader continuity into the H1Q treatment.
3. Deliver a secure, explainable and reversible minimum viable product (MVP) with correction, human exception and complete-assignment measurement.
4. Run an adequately powered 90-day pilot and issue a stop, redesign or capped-continuation decision.
5. Transfer the Business Process Model and Notation (BPMN) models, rule catalogue, data dictionary, experiment model, dashboard specification and operating controls to named Spark owners.

## 3.2 Success measures

*Table 3. KPIs, proposed targets, diagnostic reference and decision uses.*

| Measure | Definition | Target/reference and date | Owner/frequency | Gate use |
|---|---|---|---|---|
| **Major KPI** | `[(comparator churn - treatment churn) / comparator churn] × 100`; intention-to-treat (ITT) among all eligible assigned starters; all qualifying voluntary churn within 90 days, regardless of post-assignment reason coding | ≥15% point estimate by 30 Jun 2027, subject to the M6A rule below | Benefits/data owner; monthly after maturation | No positive causal verdict from the point estimate alone |
| **Sub-KPI 1: output delivery/reach** | `R_d/R_s`; assigned review output successfully displayed and recorded in either arm / review starts; display is not proof of viewing or understanding | ≥60% by 30 Jun 2027 | MySpark product owner; weekly/monthly | Journey-reach diagnostic |
| **Sub-KPI 2: recommendation acceptance** | `R_a/R_e`; explicit customer acceptance of a treatment recommendation / treatment suitability-valid recommendations; keep-current counts only with explicit confirmation; a change counts on acceptance, before fulfilment | ≥20% diagnostic reference by 30 Jun 2027 | Mobile proposition owner; weekly/monthly | Decision-to-action diagnostic; comparator choices remain separate |
| Fulfilment diagnostic | Successfully completed eligible plan changes / explicitly accepted eligible change recommendations; no-change decisions excluded | Baseline to be established | Operations owner; weekly/monthly | Separate acceptance from execution |
| Secondary churn analysis | Avoidable voluntary churn classified using a pre-specified reason taxonomy and treatment-blinded independent coding where feasible; assignment never determines cohort inclusion or primary-outcome coding | Report alongside primary estimate | Benefits/data owner; after maturation | Explore mechanism without redefining the primary endpoint |
| Financial guardrail | Treatment versus comparator consumer contribution margin and ARPU | No approved material deterioration | Finance benefits owner; monthly/90-day | Pause/stop if breached |
| Trust/suitability guardrail | Complaints, correction/reversal and privacy/security incidents | No material increase; zero severe event | Care/privacy/security owners; weekly | Immediate pause for a severe event |

Before exposure, establish `B0–B3` for all qualifying 90-day voluntary churn, successful output delivery/reach, explicit recommendation acceptance and qualifying post-review assisted-contact rate. Table 3 sets proposed targets and a diagnostic reference for assessment against these baselines. The 20% acceptance reference helps identify weaknesses in decision support and must not become a sales quota or standalone continuation criterion. An explicit keep-current confirmation counts as acceptance; decline and defer remain valid choices. Recommendation rules and staff incentives must not be adjusted to increase acceptance. Delivery, acceptance and fulfilment describe different journey stages, while causal decisions use the major KPI.

Pre-register eligibility, event definitions, missing-data handling, reason taxonomy, the confidence interval (CI) method, minimum effective sample/power, materiality tolerances and guardrails before launch, and retain these definitions and thresholds throughout the test. At M6A, capped continuation requires an observed relative reduction of at least 15%, a two-sided 95% CI with a lower bound above zero, valid randomisation and data integrity, adequate pre-specified power, passing safety, contribution and trust guardrails, and separately viable updated economics.

The 15% threshold applies to the point estimate. A positive lower CI bound supports evidence of a positive effect, although the true reduction could still be below 15%. A 17% estimate with a CI of −2% to 33% is inconclusive; a 13% estimate with a CI of 4% to 21% falls short of the target. An underpowered or invalid test cannot support a positive causal verdict. The criteria support capped continuation only, with unrestricted scale requiring further evidence.

# 4. Proposed Approach

## 4.1 Hypothesis-driven strategy

```text
Publicly bounded problem
  → Issue A2.1: plan fit may not be reviewed transparently enough
    → H1M: explanation may improve decision readiness
    → H1Q: explanation may reduce all qualifying 90-day voluntary churn by ≥15%
      → provisional root cause:
        journey may stop at data/options rather than an explainable, non-upsell decision within the eligible Spark plan set
          → provisional solution: PlanFit Navigator Core
```

In an exploratory research interview with Ryan Li on **21 August 2026**, Francis recorded decision-readiness ratings of `3/5` for A and `4/5` for B (interview record, S9). This provides limited support for H1M in one consumer-proxy case. The single participant and A→B presentation order restrict wider inference. Mechanism and process validation therefore precede design/build release, while the pilot will test H1Q.

## 4.2 Adopted framework and design principles

The approach combines a mutually exclusive, collectively exhaustive (MECE) issue/hypothesis structure with Rosemann's outcome/activity/resource redesign, BPMN 2.0, the stage-gated adopter lifecycle and intention-to-treat causal analysis. The lifecycle covers chartering, project, shakedown and onward/upward phases, recognising that benefits develop beyond technical release (INFOSYS 704 Teaching Team, 2026c, slides 47–48; Rosemann, 2001, p. 15).

The following principles guide the design:

- non-upsell PlanFit conclusions within the eligible Spark plan set;
- identical H1Q arms except for the explicit conclusion/reasons;
- minimum necessary approved data, correction and human help;
- assignment before display and revalidation before fulfilment;
- every assignment retained in the 90-day denominator; and
- evidence-based decisions to stop, redesign or continue within a cap at each release gate.

## 4.3 TO-BE process and designed efficiencies

![Figure 2. Proposed PlanFit Navigator Core TO-BE](<Figures/TOBE_Report_2026-09-18.svg>)

*Figure 2. TO-BE model with KPI targets, the 20% acceptance diagnostic reference and proposed efficiencies for pilot testing. "Neutral" denotes the non-upsell orientation defined in §1. Treatment adds the PlanFit conclusion and reasons to otherwise equivalent rules. The separate follow-up process measures 90-day outcomes.*

Figure 2 isolates the explanation change for testing; proactive timing and loyalty incentives remain outside the pilot. Assignment takes place before display. Customers can correct their information or seek human help, and eligibility is revalidated before fulfilment. Linked subprocesses document output, response and fulfilment, while a separate timer-start process measures all assignments, including non-completers, after 90 days. The pools, message flows and explicit gateways follow the course BPMN guidance (INFOSYS 704 Teaching Team, 2026a, slides 30–47).

*Table 4. Proposed redesign and efficiency measures.*

| AS-IS issue | TO-BE change | Designed efficiency | Measure |
|---|---|---|---|
| D1: data without a conclusion | Explicit PlanFit conclusion with reasons/trade-offs | Less interpretation effort; decision-ready output | H1M, acceptance, H1Q |
| D2: possible late review | Later H2 timing module, disabled in first H1Q pilot | Tests timing without contaminating explanation | Prompt response and churn |
| D3: possible repeat context | Versioned record accessible on human exception | Avoids recollecting approved context | Repeat-context rate; output delivery |
| D4: possible explanation inconsistency | Versioned rules/output, correction and revalidation | Standardised routine cases; traceable exceptions | Complaints, reversal, acceptance |
| D5: incomplete learning loop | Assignment/display/decision/exit event join plus daily maturation | One auditable cohort including non-completers | All KPIs/guardrails |

# 5. Proposed Methodology

*Table 5. Implementation methodology and stage outputs.*

| Stage | Weeks | Methods and tools | Contribution | Exit deliverable |
|---|---:|---|---|---|
| 0. Validate/govern | 1–3 | Spark-approved customer/subject-matter expert concept research; charter and responsible/accountable/consulted/informed (RACI) roles; privacy/security/data-purpose review | Prevents investment in an unsupported root cause | Customer-mechanism verdict; signed charter; metric/control approval |
| 1. Discover/instrument | 4–7 | Stakeholder workshops; Signavio AS-IS; data/reason dictionary; Excel baselines/power/economics | Establishes the baseline and decision feasibility | Validated AS-IS; `B0–B3`; data-quality/power/economics gate |
| 2. Design/prototype | 8–11 | Rosemann redesign; matched concept/usability tests; TO-BE; functional, usability, reliability, performance and supportability (FURPS) requirements; rule catalogue | Converts the provisional root cause into a falsifiable treatment | Approved prototype; TO-BE; requirements/test criteria |
| Seasonal freeze | 12–13 | Documentation and decisions only | Protects operational capacity over year-end | Post-freeze readiness plan |
| 3. Build/integrate/test | 14–21 | Rule service; MySpark user interface; instrumentation; interface/security/performance and user acceptance testing (UAT); training | Produces a reversible controlled MVP | Readiness pack and rollback approval |
| 4. Pilot/shakedown/transfer preparation | 22–38 | Conditional enrolment W22–24; controlled pilot; daily safety; 90-day maturation; ITT/sensitivity/economics | Tests H1Q and prepares a client-operable evidence package | Accepted readout; draft handover; decision recommendation |
| 5. Decide/accept handover | 39 | Steering gate; result-dependent finalisation; owner acceptance | Transfers ownership of the assets and ongoing controls | Stop/redesign/capped-continuation decision and accepted handover |

Pre-register `B0`, the sample, exclusions and contamination rules before launch. A normal approximation for a 15% relative effect, with two-sided alpha `.05`, 80% power and equal allocation, requires about **12,300/arm at B0=5%** and **20,900/arm at B0=3%**, before attrition or clustering. The assumed volume gives `600,000 × 3/52 = 34,615` gross assignments, or 17,308/arm, over three weeks. This may be insufficient. If M2 confirms inadequate power, extend enrolment and follow-up or record an inconclusive H1Q result while retaining the original effect target.

# 6. Work Plan and Timeline

![Figure 3. Proposed 39-week implementation schedule](<Figures/Gantt_2026-09-11.png>)

*Figure 3. Proposed schedule, 5 October 2026–30 June 2027. The W12–13 freeze is a capacity assumption. Cohort closure on 19 March precedes the 21 June data cut by 94 days, allowing every assigned case at least 90 days of follow-up.*

## 6.1 Milestones

*Table 6. Governance and release gates: milestone evidence and decisions.*

| Milestone | Date | Required evidence/decision |
|---|---|---|
| M0 Kickoff | 5 Oct 2026 | Signed statement of work (SOW), sponsor and team confirmed |
| M1 Problem/governance gate | 23 Oct 2026 | Spark customer/subject-matter expert concept verdict, scope/RACI and data-purpose/control decision |
| M2 Baseline/release gate | 20 Nov 2026 | Validated AS-IS, `B0–B3`, adequate data/power and Finance-accepted updated three-year CBA with NPV ≥0 and BCR ≥1 (§10.2); otherwise stop or redesign before Phase 2 |
| M3 Prototype/design gate | 18 Dec 2026 | TO-BE, prototype evidence, requirements and cost update |
| M4 Operational-readiness gate | 26 Feb 2027 | Test/UAT/security/training/rollback passed |
| M5 Pilot start | 1 Mar 2027 | Assignment and monitoring activated |
| M6 Complete 90-day data cut | 21 Jun 2027 | All cases enrolled by 19 Mar have matured; integrity checks passed |
| M6A Accepted readout | 25 Jun 2027 | ITT/sensitivity, guardrails and economics accepted |
| M7 Decision/handover | 30 Jun 2027 | Stop/redesign/capped-continuation decision and named benefit/control ownership |

## 6.2 Detailed work plan

*Table 7. Work packages, responsibilities and dependencies.*

| WP | Weeks | Key activity and deliverable | Consultant lead (§7 profile) | Spark responsibility | Dependency |
|---|---:|---|---|---|---|
| 0.1 | W1 | Kickoff; charter, scope, exclusions, RACI | Alex | Sponsor/process owner | Signed SOW |
| 0.2 | W1–2 | Run Spark-approved customer/subject-matter expert concept research; mechanism verdict and decision log | Hannah | Access approvals, customers and process subject-matter experts | Availability/consent |
| 0.3 | W2–3 | Privacy, legal, security and data-purpose review; control log | Daniel (coordination) | Privacy/legal/security control owners | Data inventory |
| 1.1 | W4–5 | Validate AS-IS/pain points; Signavio AS-IS | Priya | Process/frontline subject-matter experts | M1 |
| 1.2 | W4–7 | Event/reason/cohort/exclusion dictionary; quality report | Daniel | CRM/billing/MySpark owners | Access |
| 1.3 | W6–7 | Baselines, power and economic calibration; Excel model | Daniel | Finance benefits owner | Sufficient data |
| 2.1 | W8–9 | Co-design matched outputs/correction/help; tested prototype | Hannah | Product/care/privacy subject-matter experts | M2 |
| 2.2 | W9–11 | Finalise arms, rules, FURPS and TO-BE | Priya | Product/technology/privacy | Prototype findings |
| 2.3 | W10–11 | Update risk, cost and value case | Alex | Finance/sponsor | Design |
| F | W12–13 | Seasonal production freeze; checkpoint | Sam | Operations | M3 |
| 3.1 | W14–17 | Configure rule/output service and MySpark journey | Priya | Engineering/product | Requirements |
| 3.2 | W16–18 | Implement assignment/display/decision/outcome events and dashboard | Daniel | Data engineering | Dictionary |
| 3.3 | W18–20 | Integration, privacy, security, performance and scenario tests | Priya | Security/operations/UAT | MVP increments |
| 3.4 | W20–21 | Training, runbook, rollback rehearsal and readiness pack | Hannah | Care/product/operations | Test exit |
| 4.1 | W22–24 | Conditionally enrol and close cohort | Daniel | Product/operations | M2 power; M4 readiness |
| 4.2 | W22–37 | Daily safety; funnel/data/contamination monitoring; ≥90-day maturation | Sam / Daniel | Benefit/control owners | Pilot start/M4 readiness; cohort close for complete maturation |
| 4.3 | W35–38 | Draft and validate models, workbook, rules, training and follow-up pack | Alex + four workstream leads | Named operational owners | Work products; M6 results |
| 4.4 | W38 | Complete-cohort ITT/sensitivity/economics; accepted readout | Daniel | Finance/process owner | M6/M6A |
| 5.1 | W39 | Steering decision and result-dependent finalisation | Alex | Sponsor/steering | M6A |
| 5.2 | W39 | Accept handover and set longitudinal benefits cadence | Alex + four workstream leads | Operational owners | M6A |

The consultant leads are the team members introduced in §7. Their §12 allocations cover intermittent work across the engagement, so the plan does not assume five full-time appointments. Spark will appoint client counterparts before kickoff, with its control owners retaining legal, privacy, security and financial approval.

# 7. Team and Capabilities

> The illustrative team profiles and project examples are fictional. They describe the capabilities required for this engagement.

![Figure 4. Consultant portraits: Alex Morgan, Priya Shah, Daniel Chen, Hannah Wilson and Sam Patel](<Figures/A2-D1_Hypothetical_Team_Portraits_2026-09-15.png>)

*Figure 4. Consulting team and the five capabilities assigned to the engagement.*

*Table 8. Proposal-team capabilities and contributions.*

| Illustrative profile / role | Capability profile | Contribution to PlanFit |
|---|---|---|
| **Alex Morgan: Engagement manager; engagement-partner oversight** | 15 years in digital transformation, aligning product, technology and finance around investment gates. | Integrates workstreams, owns the client relationship and leads WP0.1/5.1 decision recommendations. |
| **Priya Shah: Process/solution architect** | 10 years in BPMN, rules and interfaces, with emphasis on exception paths and revalidation. | Leads WP1.1/2.2 and WP3.1/3.3 technical design, including human help and fulfilment controls. |
| **Daniel Chen: Data/experiment specialist** | Eight years in experiments and financial modelling, reconciling assignments with outcomes. | Leads WP1.2/3.2/4.4, protecting power, ITT denominators, guardrails and economic interpretation. |
| **Hannah Wilson: Change/research lead** | Nine years in interviews, co-design and adoption, translating exceptions into role guides and scenario practice. | Leads WP2.1/3.4 with subject-matter experts; develops prototype learning, training and adoption checks. |
| **Sam Patel: Analyst/project management office (PMO)** | Four years in schedules and risks, actions, issues and decisions (RAID), using versioned action and test records to expose dependencies. | Maintains plan and actions, supports WP4.2 monitoring and assembles WP4.3/5.2 handover evidence. |

Alex's **80 days** cover both partner oversight and engagement management. The other allocations are **60/55/45/65 days**, bringing the total to **305 person-days** (§12). Spark's product and control owners provide independent M4 acceptance and retain authority to require a stop. Engineering capacity is funded separately.

Proposed Spark counterparts include the sponsor, process/product owners, engineering/data leads, control owners and frontline subject-matter experts. Weekly delivery meetings will address workstream progress. Steering will meet fortnightly through M4 and monthly during stable maturation, with emergency escalation available. Consultants will prepare recommendations and decision records for the sponsor's investment decisions.

# 8. Change Management

## 8.1 Selected approach

The recommended approach is phased pilot-to-evidence-to-scale, with a controlled H1Q trial inside the pilot.

Phasing allows learning at lower operational exposure, although benefits arrive later and interim interfaces may be needed. Big Bang can shorten delivery and reduce transition effort, but concentrates risk (INFOSYS 704 Teaching Team, 2026c, slides 37–38; Mills, 2025, 00:38:29–00:43:15). For PlanFit, the uncertain effect and suitability risks favour repeated readiness checks and gradual exposure. These ERP implementation lessons inform the bounded MySpark change. M1 will confirm whether operational capacity supports the W12–13 freeze.

Parallel implementation can involve overlapping release work, which creates concurrent demands on subject-matter experts (Mills, 2025, 00:43:37–00:47:40), or old/new system coexistence, which brings duplicate operating costs (Mills, 2025, 00:49:18–00:50:38). PlanFit uses parallel treatment/comparator arms to compare outputs within one operating model. This experimental design and its rollback capability are distinct from a dual-system implementation strategy.

The adopter lifecycle maps chartering to Phases 0–1, project delivery to Phases 2–3, shakedown to Phase 4, and onward/upward ownership to Phase 5 and subsequent review (INFOSYS 704 Teaching Team, 2026c, slides 47–48). Decisions on unrestricted scale require evidence of benefit persistence and cashability beyond M7's 90-day readout.

*Table 9. Conditional exposure waves and release gates.*

| Wave/gate | Exposure boundary | Entry evidence | Exit/decision |
|---|---|---|---|
| Wave 0 pilot | Approx. 34,600 gross assignments over W22–24 under the 600k annual-volume assumption; treatment/comparator split | M2 power and M4 readiness | M6A causal/integrity result |
| M7 continuation gate | No automatic increase | Accepted M6A | Stop, redesign or capped Wave 1 only |
| Wave 1 | Up to 10% of the same eligible MySpark review traffic for at least six months | Decision-worthy 90-day result, guardrails, owner and monitoring | Replication, 180-day survival and controls review |
| Persistence/economics gate | Existing pilot/continuation cohorts until original pilot reaches 12 months | Cohort linkage, contribution and contact cashability | Re-run CBA; stop scale if value does not persist |
| Waves 2–4 | 25%, 50%, then up to 100% of the same eligible journey | Each preceding operational/guardrail/value gate | Hold, rollback or proceed |

Spark will approve exposure and timing at each gate. H2/H4/H5, new channels and autonomous AI require separately costed change requests that assess design, testing, cost and date impacts before work starts (Mills, 2025, 01:14:52–01:16:24, 01:18:14–01:18:31). The M2 evidence pack will also assess comparator contamination and cohort comparability.

## 8.2 Stakeholder impacts and adoption

Organisational change prepares people for changed work (Mills, 2025, 01:12:12–01:12:55). PlanFit will assess adoption through how staff give non-upsell explanations, handle corrections and escalate exceptions appropriately. Spark will confirm the impact ratings during the W4–7 workshops.

*Table 10. Proposed stakeholder impacts and adoption responses.*

| Stakeholder | Impact | Main concern | Change action/evidence |
|---|---:|---|---|
| Consumer customers | Medium | Manipulation, privacy, inaccurate input | Plain-language purpose, no-change, correction, opt-out/help and comprehension testing |
| Process/proposition owner | High | Cross-KPI trade-offs and accountability | Co-own rules and chair benefit/control reviews |
| MySpark/engineering | High | Delivery load, reliability and technical debt | Protected backlog, definition of done and rollback rehearsal |
| Data/analytics | High | Missingness, contamination and metric disputes | Data contract, reconciliation and pre-registered analysis |
| Customer care/retail | Medium–high | Extra handling time or unclear authority | Practise fit/no-change explanations, corrections, help and escalation; check the shared record and prohibit suitability overrides |
| Privacy/legal/security | Medium–high | Purpose creep, notification, access and retention | Gate authority, Privacy Act 2020 principle review, least privilege and retention schedule (Office of the Privacy Commissioner, n.d.) |
| Finance | Medium | Optimistic benefit attribution | Approve assumptions and reconcile realised benefits |
| Executive leadership | Medium | Momentum versus evidence discipline | One-page gate pack with stop/redesign alternatives |

Communications follow the delivery plan: the W1 charter, W4–7 workshops, W8–11 co-design, W18–20 scenario labs, W21 readiness review and W22–37 learning pulses. Section 11 sets out the handover schedule. In demonstration-led workshops (Mills, 2025, 01:41:12–01:44:48), Hannah and Priya will compare raw information/options with explicit fit/no-change conclusions and reasons. The workshops will test customer choices, help requests and changed eligibility. Each issue will have an owner and be classified as a design, training or scope matter.

M4 requires accepted results for critical scenarios, exceptions and rollback, with any failed critical case blocking release. Training completion, scenario-pass rates, shared-record use and correction/escalation outcomes will measure readiness and adoption. H1Q will assess the churn effect separately.

# 9. Risk Management

Scott and Vessey (2002, pp. 75–76) distinguish external business, organisational, information-systems and project risks. A strategic problem may require changes to scope, schedule or teams, and delivery efficiency alone cannot resolve a poor strategic fit. PlanFit applies this reasoning through its mechanism gate, sponsor authority and contingencies across risk levels.

The risk register uses Scott and Vessey's multi-level taxonomy and contingency logic. The proposal defines its own 1–5 likelihood/impact scales and red/amber/green (RAG) thresholds. Inherent score = `L × I`. Red = 15–25 or any severe privacy/security/suitability/causal-integrity event; Amber = 8–14; Green = 1–7. M1 will calibrate the ratings against Spark's risk appetite.

*Table 11. Provisional Scott–Vessey risk register.*

| ID | Scott–Vessey level/type | Risk | L×I / RAG rationale | Mitigation | Trigger/contingency | Owner |
|---|---|---|---|---|---|---|
| R1 | Organisational strategy | PlanFit does not fit the validated customer problem; H1M/H1Q unsupported | 3×5=15 **Red**: mechanism is unresolved and full investment would be material | Pre-engagement authentic H1M decision; Spark concept challenge; equivalent H1Q design; stop rule | Unsupported mechanism/effect → stop or promote another branch | Sponsor/process owner |
| R2 | Organisational culture | Commercial pressure turns non-upsell fit guidance into upsell | 3×5=15 **Red**: plausible incentive pressure could severely damage trust | Keep-current/decline/defer; no acceptance-linked staff incentives or rule optimisation; contribution and complaint/suitability guardrails; veto | Bias/reversal threshold → pause and review rules | Process/privacy owners |
| R3 | Organisational change | Product/frontline teams do not adopt record, exception or KPI discipline | 3×4=12 **Amber**: adoption friction is plausible but reversible by wave | Co-design, role clarity, scenario training and adoption dashboard | Low pass/use → targeted retraining or narrower scope | Change/product owners |
| R4 | IS/data | Missing assignment, exposure, reason or churn data invalidates analysis | 4×4=16 **Red**: baselines are absent and failure would invalidate H1Q | Data contract, reconciliation, missingness gate and blind coding where feasible | Gate failure → repair instrumentation and extend pilot | Data owner |
| R5 | IS/package fit | Rule produces inaccurate or unsuitable conclusion | 3×5=15 **Red**: unvalidated rules can directly create serious customer harm | Deterministic versioning, correction, UAT, human exception and suitability tests | Severe wrong-plan case → disable rule; remediate customers | Product/control owner |
| R6 | IS/interfaces | MySpark/CRM/billing hand-off creates duplicate, delayed or incorrect fulfilment | 3×5=15 **Red**: several hand-offs remain unverified and errors can affect service | Idempotency, revalidation, end-to-end scenarios and rollback | Error threshold → stop fulfilment and reconcile manually | Engineering lead |
| R7 | IS/privacy/security | Purpose, notification, access, retention or security controls fail | 3×5=15 **Red**: sensitive linked data and severe-control override apply | Privacy/legal review, least privilege, logs, retention and security test | Severe/unlawful event → immediate pause and incident response | Privacy/security owners |
| R8 | Project/design | Pilot is underpowered, contaminated or excludes non-completers | 4×4=16 **Red**: current sample feasibility depends on the unknown baseline | Power before launch, ITT, arm-equivalence audit and censoring rules | Power/contamination failure → extend/restart; inconclusive verdict | Data specialist |
| R9 | Project/scope | H2/H4/H5 or organisational change expands scope/schedule | 3×4=12 **Amber**: pressure is plausible but controlled modules can be deferred | Core-only scope, freeze, change control and module backlog | Critical path slips >2 weeks → reduce/rebaseline | Engagement manager |
| R10 | Project/champion-sponsor | Sponsor/process champion lacks authority, continuity or time | 3×4=12 **Amber**: cross-functional gates need timely senior decisions | Named deputy, decision SLA, protected time and steering quorum | Two missed gates → chair escalation/replan | Sponsor/steering chair |
| R11 | External | Competitor pricing or regulation changes during pilot | 2×4=8 **Amber**: less likely in 39 weeks but capable of confounding results | Versioned catalogue/date, regulatory watch and sensitivity | Material change → freeze interpretation and rerun | Proposition/legal owner |
| R12 | IS infrastructure | MySpark/data capacity or resilience cannot support safe operation | 2×5=10 **Amber**: major failure is severe but limited exposure lowers likelihood | Capacity/load test, feature flag, cohort cap and site reliability engineering (SRE) rollback | Service-level objective (SLO) or error breach → switch off and revert | Engineering/SRE |

The contingencies connect strategic and delivery risks. An R11 market change triggers R9 replanning while preserving the testing requirements. An R1 mismatch activates the concept/M2 stop gate. R4/R6 failures postpone customer exposure until the acceptance criteria are met.

# 10. Expected Impact and Value Creation

## 10.1 Assumptions and formulas

The financial model uses an FY25 public scale proxy: NZ$987 million mobile service revenue divided by the rounded lower value of **2.6m+ connections**, or approximately NZ$379.62 per connection annually. M2 replaces this mixed-customer proxy with current consumer average revenue per user (ARPU) and contribution data (Spark New Zealand Limited, 2025, pp. 2, 4).

*Table 12. Financial inputs and evidence status.*

| Input | Base assumption | Evidence status |
|---|---:|---|
| Annual unique eligible review starters at scale | 600,000 | Consulting assumption; below public total connections |
| Baseline all qualifying 90-day voluntary churn | 5.0% | Establish `B0`; not a measured Spark rate or an estimate of fully preventable churn |
| H1Q relative reduction | 15.0% | Proposed 90-day continuation gate |
| Saved connections at day 90 | 4,500 | `600,000 × 5% × 15%` |
| Annual revenue proxy | $379.62 | `987m / 2.6m`; approximate public proxy |
| Contribution rate | 60% | Consulting assumption |
| Avoided qualifying assisted contacts | 75,000/year | Consulting assumption; establish `B3` causal contrast |
| Cost per qualifying assisted contact | $12 | Consulting assumption |
| Implementation cost | $2.000m | Commercial assumption in §12 |
| Annual run cost | $0.650m | Commercial assumption in §12 |
| Discount rate | 8% | Consulting assumption |

```text
Illustrative 90-day retained contribution
= (4,500 × 90 / 2 customer-days) × ($379.62 × 60% / 365)
= $0.126m

Conditional day-365 retained contribution
= [4,500 × (90/2 + 275)] × ($379.62 × 60% / 365)
= $0.899m, only if the full day-90 difference persists

Operating contact-capacity value
= 75,000 × $12
= $0.900m; cashable only if spend is released or capacity is monetised

Conditional full annual cash benefit
= $0.899m + $0.900m
= $1.799m
```

The pilot will estimate customer-days from observed daily survival differences, replacing the assumed linear build-up. At M2, Finance will identify cashable contact capacity and remove any overlap with contribution.

## 10.2 Three-year cost–benefit analysis (CBA) and scenarios

*Table 13. Retention and cashability scenarios.*

| Case | Retention assumption | Contact cashability | Full annual benefit | 3-year NPV | BCR | ROI |
|---|---|---:|---:|---:|---:|---:|
| 90-day planning floor | Assumed linear build-up to day 90; none thereafter | 0% | $0.126m | **($3.495m)** | 0.05 | (94.5%) |
| 90-day + cashable capacity | Assumed linear build-up to day 90; none thereafter | 100% | $1.026m | **($2.214m)** | 0.40 | (55.2%) |
| Conditional persistence/cashability | Assumed build-up to day 90, then full difference persists through day 365 | 100% | $1.799m | **($1.114m)** | 0.70 | (21.5%) |

Table 13 presents three planning scenarios based on unvalidated inputs. The "floor" describes a modelling choice, so actual outcomes could be lower. The cases assume NZ$2.000m implementation, NZ$0.650m annual run cost, 8% discounting and 12.5%/60%/100% benefit exposure. Year 1 assumes Wave 1 covers 10% of eligible volume for ten months and Wave 2 covers 25% for two months: `(10 × 10% + 2 × 25%)/12 = 12.5%`. Year 2 exposure of 60% and Year 3 exposure of 100% are separate planning assumptions to be confirmed at later gates. Delayed or rejected releases would reduce benefits.

The simplified annual model places all implementation cost at **30 June 2027** (Time 0), followed by Years 1–3 as July–June value years. Table 14 shows the conditional cash flows.

*Table 14. Simplified conditional annual cash flow.*

| NZ$m | Time 0 | Year 1 | Year 2 | Year 3 |
|---|---:|---:|---:|---:|
| Benefit | 0.000 | 0.225 | 1.079 | 1.799 |
| Implementation cost | (2.000) | — | — | — |
| Run cost | — | (0.650) | (0.650) | (0.650) |
| **Net cash flow** | **(2.000)** | **(0.425)** | **0.429** | **1.149** |

The dated workbook uses dated net present value (XNPV) to value 45 monthly cash flows at **5 October 2026**, with the schedule ending on 30 June 2030. Client costs are spread across phase calendar days. Consulting fees are collected 30 days after separately authorised phase invoices, and benefits/run costs begin in July 2027. Under the Phase 0/1 payment schedule, dated XNPV is **−NZ$1.075m** and BCR **0.700**. Delaying benefit exposure by three/six months lowers XNPV to **−NZ$1.455m / −NZ$1.829m**, holding costs and the end date fixed. Both the dated and simplified annual calculations use the same total implementation budget. M2 financial validation will confirm cashability, client capacity and wave economics.

The base exposure implies approximately **563/2,700/4,500 annual-cohort-equivalent connections** protected at day 90 in Years 1–3. Each figure describes a separate annual cohort at that endpoint; survival through day 365 remains a modelling assumption. The following scenarios use the same costs, discounting and exposure, with day-365 persistence and 100% cashability assumed. Only the listed inputs vary.

*Table 15. Sensitivity to volume, effect and contribution assumptions.*

| Scenario | Eligible starters | Baseline churn | Relative reduction | Contribution rate | Saved connections | Cashable contact input | Conditional full annual benefit | 3-year NPV | ROI |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Conservative | 400k | 4% | 10% | 50% | 1,600 | 40k × $10 | $0.666m | **($2.726m)** | (70.9%) |
| Base | 600k | 5% | 15% | 60% | 4,500 | 75k × $12 | $1.799m | **($1.114m)** | (21.5%) |
| Upside | 800k | 6% | 20% | 70% | 9,600 | 120k × $14 | $3.917m | **$1.902m** | 71.0% |

The conservative case remains negative even with assumed benefit persistence and contact cashability. Phase 1 will therefore calibrate volume, contribution, contact capacity and wave economics before Phase 2 release. At M2, release of Phase 2 requires Finance to accept an updated three-year CBA with NPV ≥0 and BCR ≥1, alongside the data, power and control conditions in Table 6. Finance's review must cover cost estimates, benefit persistence, contact cashability and downside sensitivities, with release supported by more than the upside scenario alone. The current base case fails the economic test. If the updated case still fails, the decision is to stop or redesign before further release.

H1Q estimates the marginal effect of explicit conclusions and reasons against the equivalent-information comparator. The recalibrated business case will attribute financial value to measured operational outcomes. Rules, data, governance and instrumentation are enabling costs; attributing separate value to these components will require operational evidence.

## 10.3 Strategic, operational and organisational value

*Table 16. Value dimensions and measures.*

| Dimension | Expected value | Measure | Necessary qualification |
|---|---|---|---|
| Financial | Retained contribution and potentially cashable capacity | Survival/contribution, released spend, NPV/BCR/ROI | H1Q observes 90 days; capacity is not automatically cash |
| Strategic | Stronger execution of core-connectivity/customer-experience priorities | H1Q; connection trend as secondary lag | One process cannot explain group share |
| Operational | Decision-ready output, versioned rules and auditable events | Output delivery/reach, acceptance, fulfilment, cycle time, repeat context, defects | Baselines unavailable; display is not comprehension |
| Organisational | Named process/benefit owners and reusable experiment/BPMN capability | Ownership, training, cadence | Adoption must be measured |
| Customer/trust | Non-upsell no-change, correction and human challenge | Comprehension, complaints, corrections | Misleading explanation can harm |

## 10.4 Impact–Value Matrix

Value = 40% strategic (`S`) + 30% customer (`C`) + 30% financial (`F`) score. Change impact is the mean of process, people, data and technology impact. Each component uses 1–5. The illustrative scores provide a starting point for the client workshop, which will confirm or replace them. Evidence grade `A` = validated Spark internal evidence; `B` = verified external evidence or replicated test; `C` = evidence-bounded inference/calculation using unvalidated inputs; `D` = exploratory consulting assumption. Table 17 records the current grades as C or D.

*Table 17. Impact–value inputs, scores and option decisions.*

| Initiative | S/C/F value inputs | Client value | Process/people/data/technology impact inputs | Change impact | Cost bubble | Evidence | Decision |
|---|---:|---:|---:|---:|---:|:---:|---|
| Event instrumentation and complete-assignment KPI loop | 4.0/3.5/3.0 | 3.55 | 3.0/2.5/4.5/3.0 | 3.25 | $0.45m | C | Do first; prerequisite |
| **PlanFit Navigator Core** | **4.5/4.5/2.0** | **3.75** | **4.0/3.5/4.5/4.0** | **4.00** | **$2.00m** | C | Potentially high non-financial value; pilot only after concept/M2 gates |
| H5 broader continuity | 4.0/4.0/1.5 | 3.25 | 5.0/4.5/5.0/4.5 | 4.75 | $1.20m | D | Separate case |
| H2 proactive timing | 4.0/4.0/2.0 | 3.40 | 4.0/3.5/4.5/4.0 | 4.00 | $0.90m | D | Separate causal/privacy gate |
| H4 loyalty/value | 3.5/3.5/2.0 | 3.05 | 4.0/4.5/3.5/4.0 | 4.00 | $1.40m | D | Separate margin/fairness gate |
| Autonomous AI retention agent | 3.5/3.0/1.0 | 2.60 | 5.0/5.0/5.0/5.0 | 5.00 | $4.00m | D | Defer |
| Static wording only | 2.0/2.5/1.5 | 2.00 | 1.5/1.5/1.0/2.0 | 1.50 | $0.15m | C | Comparator/quick hygiene |

![Figure 5. Impact–Value Matrix with cost-scaled bubbles](<Figures/Impact_Value_2026-09-11.png>)

*Figure 5. Initiative comparison using illustrative scores for client review. Bubble area represents assumed cost. The options overlap in scope, so their costs cannot be added together.*

Instrumentation is a prerequisite for Core. Its strategic and customer benefits remain conditional, and the negative financial case limits further investment under the M2 rule. Broader modules require separate evidence and investment decisions.

# 11. Client Responsibilities and Collaboration Model

## 11.1 Required contributions

*Table 18. Proposed Spark responsibilities and escalation.*

| Spark responsibility | Timing | Why critical | Escalation if absent |
|---|---|---|---|
| Appoint sponsor, process/product and control owners | Before M0 | Decision rights and sustained ownership | Delay kickoff |
| Provide subject-matter experts and current process/system documentation | W1–7 | Validate AS-IS and feasibility | Mark unverified/reduce scope |
| Approve purpose, privacy/notification, security and access | W1–3 | Mandatory control | No extraction/pilot |
| Supply pseudonymised CRM, billing, MySpark, contact, fulfilment and churn fields | W4–7/pilot | Baseline and causal analysis | Fail M2 |
| Approve cohort, exclusions, metrics and financial assumptions | By M2 | Prevent post-outcome changes | No pilot |
| Allocate product/engineering/data/UAT/frontline capacity | W8–39 | Build, test, operate and transfer | Rebaseline scope/date |
| Decide at gates within three business days | M1–M7 | Protect critical path | Sponsor escalation |
| Own remediation and incident response | Before M4 | Customer safety | No exposure |
| Accept knowledge assets and benefits cadence | W35–39 | Avoid consultant dependency | No closure/continuation |

Before M2/M3, Alex and Spark's owners must reserve subject-matter expert, UAT and training time against the work plan in §6 (Mills, 2025, 01:02:41–01:05:20). Capacity shortfalls require revised scope, dates and costs while preserving testing and follow-up requirements. The sponsor is responsible for removing blockers and deciding trade-offs (Mills, 2025, 01:10:45–01:11:15).

## 11.2 Collaboration cadence and knowledge transfer

*Table 19. Collaboration and knowledge-transfer agenda.*

| Event | Timing | Agenda/output |
|---|---|---|
| Kickoff | W1, 2 hours | Scope, evidence boundary, RACI, gates and charter |
| AS-IS elicitation | W2, 3 hours | Token-walk cases, D1–D5 challenges and change list |
| KPI/data/privacy workshop | W3, 2.5 hours | Cohort, exclusions, fields, owners and control decision |
| Baseline/power review | W7, 90 minutes | `B0–B3`, quality, sample/power and M2 decision |
| Prototype co-design | W8–9, two 2-hour sessions | Raw information/options versus explicit fit/no-change conclusion plus reasons; correction and help |
| Failure/readiness workshop | W20, 2 hours | Bad data, changed eligibility, outage, rollback and incident |
| Pilot pulse | Weekly W22–37, 30 minutes | Safety, funnel, data quality and defects; no premature effect claim |
| Readout | W38, 2 hours | ITT, sensitivity, guardrails, economics and recommendation |
| Handover | W39, 2 hours | BPMN, workbook, rules, dashboard, training and owner acceptance |

The handover package includes editable Signavio models, the data/reason/cohort dictionary, the Excel Gantt/risk/cost/CBA/scenario workbook, research/pilot protocols, the rule catalogue, test and rollback records, the dashboard specification, the benefits pack and train-the-trainer materials. Handover completion requires named Spark owners to token-walk the model, reproduce the workbook, explain KPI denominators, govern a rule change and execute pause/rollback.

# 12. Commercials: Fees and Terms

## 12.1 Implementation envelope

*Table 20. Provisional phase costs and accounting classification.*

| Phase | Consulting fee | Spark/third-party delivery allowance | Capex assumption | Opex assumption | Total |
|---|---:|---:|---:|---:|---:|
| 0 Validate/govern | $50k | $70k | $0k | $120k | $120k |
| 1 Discover/instrument | $80k | $200k | $100k | $180k | $280k |
| 2 Design/prototype | $95k | $145k | $100k | $140k | $240k |
| 3 Build/integrate/test | $80k | $620k | $550k | $150k | $700k |
| 4 Pilot/shakedown/transfer preparation | $75k | $505k | $150k | $430k | $580k |
| 5 Decide/finalise/accept transfer | $40k | $40k | $0k | $80k | $80k |
| **Total** | **$420k** | **$1,580k** | **$900k** | **$1,100k** | **$2,000k** |

The Spark/third-party delivery allowance estimates the budget for Spark engineering, data, UX, environments, assurance and external services. Spark will confirm resourcing and procurement separately from the consulting-fee invoice; the allowance is a provisional budget, with cash approval and person-day allocations still to be agreed. At M2, Finance will confirm capital expenditure (Capex) and operating expenditure (Opex) treatment under Spark's accounting policy and control of the resulting assets. The model includes the full **NZ$650k annual run-cost envelope from July 2027 during the exposure ramp**: platform/cloud/licence/monitoring 180k; product/data/engineering support 320k; customer research/rule/suitability review 100k; training/assurance/contingency 50k.

Table 21 shows cumulative exposure under the release decisions in Table 6, assuming each phase is authorised.

*Table 21. Maximum cumulative exposure at each gate.*

| Gate reached / phases released | Cumulative consulting fees | Cumulative Spark/third-party delivery allowance | Cumulative maximum exposure |
|---|---:|---:|---:|
| M1 / Phase 0 only | $50k | $70k | **$120k** |
| M2 / Phases 0–1 | $130k | $270k | **$400k** |
| M3 / plus Phase 2 | $225k | $415k | **$640k** |
| M4 / plus Phase 3 | $305k | $1,035k | **$1,340k** |
| M6A / plus Phase 4 | $380k | $1,540k | **$1,920k** |
| M7 / plus Phase 5 | $420k | $1,580k | **$2,000k** |

Authorising Phases 0–4 before the causal readout would expose up to NZ$1.920m. At M6A, the observed effect and updated economics will inform the decision under §3.2.

## 12.2 Fee basis and payment terms

*Table 22. Provisional fee basis.*

| Role | Assumed days | Day rate | Fee |
|---|---:|---:|---:|
| Engagement manager | 80 | $1,500 | $120,000 |
| Process/solution architect | 60 | $1,600 | $96,000 |
| Data/experiment specialist | 55 | $1,500 | $82,500 |
| Change/research lead | 45 | $1,250 | $56,250 |
| Analyst/PMO | 65 | $1,000 | $65,000 |
| **Rounded fixed-fee envelope** |  |  | **$420,000** |

The five §7 profiles account for **305 person-days and NZ$419,750**, rounded to a **NZ$420,000 fixed-fee envelope**. This includes Alex's combined responsibilities. Procurement will confirm rates and availability before the statement of work is signed.

*Table 23. Consulting-fee payment triggers.*

| Phase/payment trigger | Amount |
|---|---:|
| Phase 0: SOW signature (40%); M1 acceptance (60%) | $20,000; $30,000 |
| Phase 1: **only after M1 authorisation** (40%); M2 acceptance (60%) | $32,000; $48,000 |
| Phase 2: after M2 authorisation (40%); M3 acceptance (60%) | $38,000; $57,000 |
| Phase 3: after M3 authorisation (40%); M4 acceptance (60%) | $32,000; $48,000 |
| Phase 4: after M4 authorisation (30%); cohort close (40%); M6A acceptance (30%) | $22,500; $30,000; $22,500 |
| Phase 5: after M6A authorisation (50%); M7 handover acceptance (50%) | $20,000; $20,000 |
| **Total if every phase is released** | **$420,000** |

Invoices are due within 30 days and exclude GST. Travel/other expenses require written pre-approval and reimbursement at cost, capped at 2% of the consulting fee for each authorised phase (up to NZ$8,400 if all phases are released). They form part of implementation Opex within the existing Spark/third-party delivery allowances. The phase and cumulative exposure limits in Tables 20–21 therefore include these expenses, with the NZ$120,000 initial and NZ$2.000m total caps retained. Any increase in these limits requires a signed change request before the expense is incurred.

New channels, H2/H4/H5 modules, autonomous AI, out-of-scope customer segments or material timeline changes also require a signed change request. Customer data will remain in Spark-approved environments. Payments relate to accepted work, while KPI and investment decisions follow the stage gates. Authorised legal review will cover liability, confidentiality, intellectual property (IP), data processing, warranty and termination terms.

# 13. Next Steps

> Approve Phase 0 only: release NZ$50,000 consulting fees and provisionally allocate up to NZ$70,000 Spark/third-party delivery allowance (NZ$120,000 maximum initial exposure) to test the customer mechanism, governance and data access. Release Phase 1's NZ$80,000 fee and up to NZ$200,000 delivery allowance at M1 only if those conditions pass. Tables 6 and 21 define the evidence and maximum exposure for subsequent releases.

Phase 0 will test the customer mechanism and the feasibility of controls/data access before larger design and build commitments. Its value lies in improving the investment decision, with programme returns still dependent on the subsequent economic assessment. Phase 1 will replace the economic assumptions; Phase 2 can proceed only if the M2 economic test in §10.2 and the other release conditions pass.

*Table 24. Proposed immediate actions.*

| Date | Immediate action | Owner |
|---|---|---|
| 21–23 Sep 2026 | Review assumptions, scope, evidence gaps and client questions | Spark sponsor/procurement |
| 24 Sep 2026 | Decision in principle and preferred engagement option | Sponsor |
| 25–28 Sep 2026 | Finalise SOW, controls, team and data prerequisites | Joint |
| 30 Sep 2026 | Confirm sponsor, process/data/product/control owners and workshops | Sponsor |
| 2 Oct 2026 | Issue kickoff pack, data request and secure-workspace instructions | Engagement manager |
| **5 Oct 2026** | **Kickoff workshop** | **Joint team** |

The client can choose: (1) the recommended Phase 0-only authorisation, followed by a separately approved Phase 1 at M1; (2) a 39-week framework agreement in which each phase requires separate spending approval; or (3) a diagnostic ending at M1 if the customer mechanism, governance or data access is unsupported. These options provide different levels of engagement commitment (INFOSYS 704 Teaching Team, 2026d, slide 25).

# 14. Learning Journeys: Strengthening the Proposal

The five Learning Journeys support improvements to process assumptions, delivery dependencies, pilot evidence, decision controls and release readiness. Figure 6 maps each improvement to a specific SAP functionality and its learning source. The relevant project gates will determine architecture, investment and adoption.

![Figure 6. How the five Learning Journeys strengthen PlanFit](<Figures/A2-D1_LJ_Evidence_Map_2026-09-11.png>)

*Figure 6. Proposal improvements, supporting SAP functionality and exact LJ course/lesson locators. Arrows show the reading order. Full sources are in §14.2.*

## 14.1 Proposal improvements and supporting functionality

I1: Review process assumptions before design approval (§§2 and 4). SAP Signavio's Editor provides attributes, BPMN syntax checks and modelling-convention checks (SAP, n.d.-d). In WP1.1/2.2, reviewers will use these features to distinguish supported observations from proposed responsibilities and exception paths. Pain points, KPI definitions and evidence status will be attached to the relevant AS-IS/TO-BE elements, with findings recorded for design review. Subject-matter experts will validate Spark's actual process in WP1.1. Table 25 locates this functionality in LJ1.

I2: Establish dependencies and accountability before delivery commitments (§§6, 9, 11 and 12). SAP LeanIX Fact Sheets and typed relations support a structured application/data inventory (SAP, n.d.-a). WP1.2 will use this inventory to record the provisional MySpark, CRM, billing and data interfaces and assign accountable owners before budget allowances become commitments. This will identify the R6 integration objects to test in WP3.3. Cross-type generic dependencies are displayed on Fact Sheets and in table view, outside standard reports. WP1.2 will confirm Spark architecture and ownership. LJ2 covers this functionality.

I3: Make pilot evidence comparable and distinguish it from value assumptions (§§3, 6 and 10). SAP Analytics Cloud separates dimensions from measures and distinguishes read-only analytic models from read-write planning models (SAP, n.d.-b). WP1.2/3.2 will define arm, cohort and plan dimensions, alongside separate measures for assignment, display, valid-treatment-recommendation, acceptance and churn. Consistent denominators will support the pilot and business case. The model will reconcile the §3.2 definitions, retain non-completers and record treatment acceptance separately from comparator choices. Power and causal inference will rely on observed pilot data and the pre-registered analysis. LJ3 covers these modelling capabilities.

I4: Make decision and exception controls reproducible and testable (§§4–5 and 8–9). SAP Build Process Automation maps inputs through policies/rules to decisions and approval routing (SAP, n.d.-c). WP2.2/3.1 will adapt this pattern for approved fit/no-change inputs, conditions, reasons and human exceptions, giving R5 tests and frontline training explicit expected behaviours. Common rules will remain identical across H1Q arms, with treatment adding the conclusion/reasons. Correction and pre-fulfilment revalidation remain mandatory. LJ4 teaches the pattern through a sales-order example, which the design team will translate into telecom rules and approval controls.

I5: Use traceable evidence for release readiness and handover (§§6, 9 and 11). SAP Cloud ALM links requirements/user stories to cases, expected/actual results, defects and retesting (SAP, n.d.-e). WP3.3/3.4 will trace assignment-before-display, revalidation, correction and rollback to test results. Gate owners will be able to identify tested controls and outstanding defects in the M4 readiness pack for R5/R6. The same records will provide maintainable evidence for Week 39 owners after handover. LJ5 covers this testing functionality.

The five applications are options for assessment within the existing work plan. Adoption will depend on architecture, licensing, integration and cost review. Their inclusion does not add assumed benefits to the financial model, which attributes value only to measured operational outcomes. The proposal therefore retains the NZ$2.000m budget, NZ$650k annual run-cost assumption and negative base NPV.

## 14.2 Exact learning-source locators

All five selected SAP functionalities are covered in the cited LJs. WP1–3 will translate them into the proposal-specific telecom rules, KPI definitions and release criteria. Unit numbers follow the course directories, and lesson numbers indicate position within the unit, excluding quizzes.

*Table 25. Improvement-to-functionality traceability and exact SAP learning-source locators.*

| Improvement → supporting functionality | LJ and full Learning Journey title | Course | Unit | Lesson |
|---|---|---|---|---|
| **I1:** Reviewable process assumptions → Editor attributes and syntax/convention checks | **LJ1:** [Managing Business Processes with SAP Signavio Solutions](https://learning.sap.com/learning-journeys/managing-business-processes-with-sap-signavio-solutions) | Managing Business Processes with SAP Signavio Solutions | **4:** Introducing SAP Signavio Process Manager | **3:** [Modeling with the Editor](https://learning.sap.com/courses/managing-business-processes-with-sap-signavio-solutions/the-editor-quick-n-easy-modeling_fd121490-31f9-4229-a10a-8a3a68972fa3) |
| **I2:** Explicit dependencies/accountability → Fact Sheets and typed relations | **LJ2:** [Learning to Use LeanIX for Successful Enterprise Architecture](https://learning.sap.com/learning-journeys/learning-to-use-the-leanix-tool-for-successful-enterprise-architecture) | Learning to Use SAP LeanIX for Successful Enterprise Architecture | **2:** Modeling Fact Sheets in SAP LeanIX | **2:** [Defining SAP LeanIX Fact Sheets and Modeling Relations and Dependencies](https://learning.sap.com/courses/learning-to-use-sap-leanix-for-successful-enterprise-architecture/defining-sap-leanix-fact-sheets-and-modeling-relations-and-dependencies_ce548272-cbab-4d1d-b94b-77d5c13c3935) |
| **I3:** Comparable pilot evidence → Dimensions, measures and analytic/planning model distinctions | **LJ3:** [Becoming a Certified Data Analyst in SAP Analytics Cloud](https://learning.sap.com/learning-journeys/becoming-a-certified-data-analyst-in-sap-analytics-cloud) | Exploring SAP Analytics Cloud | **4:** Using Modeling | **1:** [Explaining Modeling Options](https://learning.sap.com/courses/exploring-sap-analytics-cloud/explaining-modeling-options_bf2b9e1c-81b7-4fec-836d-d9062081fa24) |
| **I4:** Testable decision controls → Policy/rule inputs, outputs and approval routing | **LJ4:** [Developing with SAP Build – From Apps to Automation](https://learning.sap.com/learning-journeys/developing-with-sap-build-from-apps-to-automation) | Developing with SAP Build Process Automation | **5:** Using Features of Advanced Process Building in SAP Build Process Automation | **1:** [Improving the Sales Order Management Process with Decision Logic](https://learning.sap.com/courses/developing-with-sap-build-process-automation/improving-the-sales-order-management-process-with-decision-logic_e13b26bd-9ba6-48ba-a7f0-d8879c1bb14f) |
| **I5:** Evidence-based readiness/handover → Requirements-linked tests, results and defects | **LJ5:** [Transforming for Success with SAP Cloud ALM](https://learning.sap.com/learning-journeys/transforming-for-success-with-sap-cloud-alm) | Implementing with SAP Cloud ALM | **7:** Planning and Executing Testing | **1:** [Planning and Executing Testing](https://learning.sap.com/courses/implementing-with-sap-cloud-alm/planning-and-executing-testing_ef46a49b-9885-4aaa-841d-5ac9c80a3681) |

# Referencing & Academic Integrity

## References

Commerce Commission. (2025, November 13). *Mobile transparency guidelines*. https://www.comcom.govt.nz/assets/Documents/review-of-consumer-mobile-bills/Mobile-Transparency-Guidelines-13-November-2025.pdf

Commerce Commission. (2026). *2025 telecommunications monitoring report: Pūrongo aroturuki torotoro waea 2025*. https://www.comcom.govt.nz/assets/Uploads/2025-Telecommunications-Monitoring-Report-29-June-2026.pdf

INFOSYS 704 Teaching Team. (2026a). *IT consultancy: Labs content—Lab 3* [PowerPoint slides]. University of Auckland.

INFOSYS 704 Teaching Team. (2026b). *Week 1: Lecture 3—Problem solving process: Identifying the business need* [PowerPoint slides]. University of Auckland.

INFOSYS 704 Teaching Team. (2026c). *Week 5: Lecture 7—Implementation roadmaps* [PowerPoint slides]. University of Auckland.

INFOSYS 704 Teaching Team. (2026d). *Week 5: Lecture 8—Presenting your ideas: Presenting your proposal* [PowerPoint slides]. University of Auckland.

Mills, A. (2025, August 26). *SAP and ERP journey: Delivery excellence* [Guest lecture recording]. University of Auckland. https://auckland.au.panopto.com/Panopto/Pages/Viewer.aspx?id=745dbda2-e7d0-4a34-971a-b33d00f7aed1

Office of the Privacy Commissioner. (n.d.). *Privacy Act 2020*. Retrieved September 15, 2026, from https://www.privacy.org.nz/privacy-principles/

Rosemann, M. (2001). *Business process lifecycle management* [White paper]. Queensland University of Technology.

SAP. (n.d.-a). *Defining SAP LeanIX fact sheets and modeling relations and dependencies*. SAP Learning. https://learning.sap.com/courses/learning-to-use-sap-leanix-for-successful-enterprise-architecture/defining-sap-leanix-fact-sheets-and-modeling-relations-and-dependencies_ce548272-cbab-4d1d-b94b-77d5c13c3935

SAP. (n.d.-b). *Explaining modeling options*. SAP Learning. https://learning.sap.com/courses/exploring-sap-analytics-cloud/explaining-modeling-options_bf2b9e1c-81b7-4fec-836d-d9062081fa24

SAP. (n.d.-c). *Improving the sales order management process with decision logic*. SAP Learning. https://learning.sap.com/courses/developing-with-sap-build-process-automation/improving-the-sales-order-management-process-with-decision-logic_e13b26bd-9ba6-48ba-a7f0-d8879c1bb14f

SAP. (n.d.-d). *Modeling with the editor*. SAP Learning. https://learning.sap.com/courses/managing-business-processes-with-sap-signavio-solutions/the-editor-quick-n-easy-modeling_fd121490-31f9-4229-a10a-8a3a68972fa3

SAP. (n.d.-e). *Planning and executing testing*. SAP Learning. https://learning.sap.com/courses/implementing-with-sap-cloud-alm/planning-and-executing-testing_ef46a49b-9885-4aaa-841d-5ac9c80a3681

Scott, J. E., & Vessey, I. (2002). Managing risks in enterprise systems implementations. *Communications of the ACM, 45*(4), 74–81. https://doi.org/10.1145/505248.505249

Spark New Zealand Limited. (n.d.). *Change mobile plan*. Retrieved August 4, 2026, from https://www.spark.co.nz/help/mobile/manage/change-mobile-plan

Spark New Zealand Limited. (2025). *Annual report FY25*. https://www.spark.co.nz/content/dam/spark/documents/pdfs/governance/FY25_Annual_Report.pdf

Spark New Zealand Limited. (2026a). *Annual report FY26*. https://investors.sparknz.co.nz/FormBuilder/_Resource/_module/gXbeer80tkeL4nEaF-kwFA/doc/FY26_Annual_Report.pdf

Spark New Zealand Limited. (2026b, July 27). *SPK-30 advanced with strategic review of Digital Services*. NZX. https://www.nzx.com/announcements/476684

Spark New Zealand Limited. (2026c, August 20). *Spark New Zealand FY26 results summary*. https://investors.sparknz.co.nz/FormBuilder/_Resource/_module/gXbeer80tkeL4nEaF-kwFA/doc/H2FY26_Results_Presentation.pdf

## GenAI Use Disclosure

I used **ChatGPT (Codex) and its integrated tools** only for the non-core support tasks below. No other GenAI tool was used.

| Tool (model / period)              | Task                                                         |
| ---------------------------------- | ------------------------------------------------------------ |
| ChatGPT                            | Explaining course concepts, SAP/Signavio terminology and lab material so I could apply them myself |
| ChatGPT Deep Research / web search | Locating publicly available sources (Spark annual reports and NZX releases, Commerce Commission reports, Privacy Commissioner guidance, SAP Learning pages) and confirming titles, dates and URLs |
| ChatGPT                            | APA 7 checking of reference-entry format and in-text citation style |
| ChatGPT                            | Language and clarity check of paragraphs I had already written (grammar, punctuation, concision) |
| ChatGPT image generation           | Creating one clearly labelled fictional consulting-team illustration strip (Figure 4) from a prompt I wrote |

# Interview transcripts

The two A1-D2 records are available at:

[GenAI Interview Transcript](https://drive.google.com/file/d/186NsQ3rLC8_AAMFpHd5WJVHU3xODbGX5/view): https://drive.google.com/file/d/186NsQ3rLC8_AAMFpHd5WJVHU3xODbGX5/view
[Group-member interview — Ryan Li](https://drive.google.com/file/d/14xrWdUqY3p7VV-LJxecHGms5_ZiSE0u6/view): https://drive.google.com/file/d/14xrWdUqY3p7VV-LJxecHGms5_ZiSE0u6/view
