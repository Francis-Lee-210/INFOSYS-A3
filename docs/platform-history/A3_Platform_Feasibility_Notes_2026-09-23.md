# A3 PlanFit: SAP Platform Feasibility Notes

> **Course-source update — 6 October 2026:** The current [A3 V3 requirements](../../作业要求.md) now specify **OpenCode.ai + SAP APIs** and an exported ZIP. The [API Pool v3](<../../resources/api/SAP API Pool v3.xlsx>) is available locally. The Build Apps/AppGyver/Build Code implementation and platform conclusions below are a **23 September research snapshot, superseded as current course instructions**. Preserve the business proposal and historical citations; API fit, revised effort, actual access, independent package execution and the team's final choice have not been verified. This update does not select, redevelop or validate PlanFit.

**Checked:** 23 September 2026.  
**Purpose:** Evidence for evaluating Francis's proposed PlanFit candidate. This is a research note, not an implementation, platform selection, or record of successful tenant tests.  
**Scope:** SAP Build Apps/AppGyver, SAP Build Code, packaging, access, and persistence. No account, service, project, deployment, or migration was created.

## Recommendation

Keep the candidate's first implementation small: one responsive web workflow using a bundled synthetic offer catalogue and explicit rules, with needs capture, an explained conclusion, a customer decision and a saved local receipt. A separate fulfilment simulator and aggregate event summary are optional additions, as defined in the [candidate proposal](../../candidates/A3_App_Candidate_Options-Francis.md). This is an **engineering recommendation**, not a verified SAP implementation. The business rules and test cases can be agreed before the final platform is known.

Use the **course-confirmed SAP product and institution-authorised environment**. If the course confirms SAP Build Code, a modest SAPUI5/JavaScript application developed in SAP Business Application Studio is a plausible route. If it confirms an existing SAP Build Apps environment with adequate support and retention, the same workflow is a plausible visual-logic implementation. Do not choose between them merely because both appear in the SAP Build lobby: Build Code is documented as a coding environment incorporating Business Application Studio, with CAP, Fiori, mobile, and SAPUI5 support (SAP, n.d.-a).

For now, platform feasibility is **conditional**. The local [A3 requirements](../../作业要求.md) retain a conflict between Apps/AppGyver in the specification and Build Code in the assignment title/rubric. Public product documentation cannot resolve what the marker expects.

## Verified public documentation and its implications

| Verified documentation | Implication for this candidate | Still unverified |
|---|---|---|
| SAP says standalone SAP Build Apps entered deprecation from **23 March 2026**. Existing contracted customers retain supported access through their current contract (SAP, n.d.-b). | A new proposal should not assume indefinite availability of a legacy AppGyver/Build Apps account. Existing course access may still be usable. | The course tenant's edition, contract, availability, and retention after marking. The documentation does not identify the university's entitlement. |
| SAP's documented web-frontend migration takes an Apps `.mtar` through a support-ticket conversion to React or SAPUI5. The result requires review and testing; backend connections are not established by that transformation (SAP, n.d.-b). | Migration is not a reliable last-minute fallback for an A3 prototype. | Student access to the support procedure, turnaround, and correctness for this app. None was tested. |
| SAP Build's basic trial is **30 days**, uses a shared tenant and sample data, and restricts administration/customisation and integration capabilities (SAP, n.d.-c). | A guided trial should not be assumed to provide an unrestricted project environment or the required marking retention. | Whether the course provides a separate educational environment and the permissions it permits. |
| SAP BTP trial is **90 days**; its documentation excludes team development and states that trial applications stop daily. Inactivity and end-of-trial deletion rules also apply (SAP, n.d.-d). | Do not base group collaboration or assessment retention on an assumed personal-trial entitlement. Confirm the course-supported arrangement. | Account registration date, tenancy model, permitted team workflow, and exact restart/expiry conditions. |
| SAP Business Application Studio's trial service-plan documentation permits two dev spaces, only one running at once, and deletes a dev space that has not run for 30 consecutive days (SAP, n.d.-e). | Any applicable trial workspace needs off-platform source backup and a retention plan. | The group's actual BAS service plan. These are documented trial conditions, not evidence that they apply to an institutional plan. |
| Build Apps offers on-device storage, stored on the device or in the browser cache. It is local to that device/browser; people sharing the browser also share the local data (SAP, n.d.-f). | It can support a synthetic demo history without a live backend. It is unsuitable evidence of a shared production audit trail. | Whether the chosen preview/deployment preserves local records across refresh/reopen and how its export treats data. |

No free student entitlement or access to a particular university SAP tenant was verified. “Free”, “trial”, “educational access”, and “the course's environment” must be recorded separately.

## Packaging: a ZIP is not a sufficient acceptance test

SAP documentation describes different packages for different purposes:

| Artifact / operation | What the documentation establishes | Required A3 check |
|---|---|---|
| Build lobby project export | The documented lobby export creates an **MTAR** containing project configurations; this export option is explicitly unavailable for **Build Code** projects (SAP, n.d.-g). | Confirm which native export the course expects and whether a submission ZIP is an outer container for it. |
| Build Apps editable-project import | SAP's Apps tutorial uses an `.mtar` import through the lobby. It separately provides `.zip.gpg` for the editor's **Replace** operation, which discards the target project's existing content (Wroblewski, 2026). | Reimport only into a fresh test project. A compiled web bundle and an editable project export are different deliverables. |
| Build Code/BAS source import | Business Application Studio can import a project supplied as a **ZIP or TAR** into a dev space (SAP, n.d.-h). | Include the source and required project/configuration files, synthetic fixtures, dependency manifest, and run instructions. Verify installation and execution in the target environment; successful import alone proves neither. |
| Build Apps web build | SAP's Web Client extension guide describes downloading a generated build as an MTAR or ZIP, depending on the route (SAP, n.d.-i). | Do not assume that a deployable build ZIP can be reopened as an editable Apps project. Verify the marker's intended operation. |

Do not rename a native archive to `.zip` to simulate compatibility. Obtain the required package contract from the course and demonstrate the actual open/import/run path. This is a proposal-level acceptance criterion; no export or import was performed in this research.

## Minimal implementation mapping

The following are **proposed designs**, supported at a capability level rather than tested in the group's tenant.

| PlanFit element | Build Apps route, if confirmed | Build Code route, if confirmed |
|---|---|---|
| Needs capture | Input controls, page/app variables, validation, and navigation. | SAPUI5 form controls and a small validated state model. |
| Deterministic shortlist | A short synthetic list plus formula/logic conditions for eligibility, fit, ranking, and explanation text. | Bundled JSON catalogue and pure JavaScript filtering/ranking functions. |
| Decision and receipt | Explicit choices including keep-current; update local review status and save a decision receipt. | The same state transitions and receipt in a local app model. |
| Demonstration records | On-device synthetic records, an inspection view and reset; an aggregate summary is optional. | Browser-local synthetic records, an inspection view and reset; an aggregate summary is optional. |
| Repeatable assessment | Embed seed fixtures and expected outcomes in the package; test source import and rebuilt preview. | Package source, fixtures, tests and run instructions; test in a fresh dev space/workspace. |

SAP's developer material documents formula bindings, variables, conditional visibility, data logic and navigation as Build Apps capabilities (SAP, n.d.-j). This supports the proposed direction; it does not establish that every rule will be easy to express or that the group's edition exposes every feature.

For the minimum prototype, avoid a dependency on a live Spark API, real customer authentication, SAP HANA, CAP services, a shared database, or native mobile packaging. These additions would require separate integration and entitlement checks. A local app can demonstrate the complete decision workflow, but its confirmation must state that no real plan or account was changed. Its summary must report **demo/test outcomes**, not Spark retention or churn outcomes.

## Platform gate before implementation

This gate is proposed for the team's later implementation stage. It has **not been executed**.

1. **Confirm the assessment contract:** product, allowed project type, native editable source format, required ZIP contents, marker open/run method, and the date until which the cloud project must remain available.
2. **Confirm authorised access:** tenant owner, edition/service plan, named group-member access or course-approved collaboration procedure, roles, remaining validity, and any service quota. A successful individual login alone does not close this step.
3. **Prove the smallest complete slice:** after development is authorised, use a disposable project with one input, one deterministic result, and one saved synthetic outcome. Export/package it immediately rather than waiting for a finished app.
4. **Verify the submitted-package path:** have a different group member use the exact proposed submission ZIP in a fresh project/workspace or the course's specified marking setup. Record import/open steps, dependency installation if needed, result, errors, and package version. Retain the original native export as well as any outer ZIP.
5. **Check persistence separately:** reopen/refresh on the same device, reopen on another browser, reset and reseed. Expected behaviour must be documented; browser-local data must not appear to be a shared database. Make the submitted package recreate its synthetic starting state without access to the original browser.
6. **Check availability through marking:** retain source, package and seed data locally; preserve the cloud project; record applicable inactivity/expiry conditions and who will maintain access. A recording is supporting evidence, not a replacement for the required functioning app.

If the package cannot be reproduced, change the packaging or platform plan before expanding features. If only the platform remains unknown, the candidate can still enter the four-way comparison with an explicit unresolved feasibility dependency. The team should not award it a higher score based on unverified access or successful reimport.

## Sources

All public sources below were checked on **23 September 2026**. SAP Help Portal pages were available through indexed page text; no authenticated tenant functionality was tested. The local requirements/worksheet were read for context, not treated as a fresh live Canvas verification.

- SAP. (n.d.-a). [What is SAP Build Code](https://help.sap.com/docs/build_code/d0d8f5bfc3d640478854e6f4e7c7584a/504854f457cc4fbf9f79136dbc773618.html). SAP Help Portal.
- SAP. (n.d.-b). [SAP Build Apps — The path forward](https://help.sap.com/docs/build-apps/service-guide/sap-build-apps-path-forward). SAP Help Portal.
- SAP. (n.d.-c). [SAP Build trial](https://www.sap.com/products/technology-platform/build/trial.html).
- SAP. (n.d.-d). [Trial accounts and free tier](https://help.sap.com/docs/btp/sap-business-technology-platform/trial-accounts-and-free-tier?locale=en-). SAP Help Portal. [SAP-maintained documentation source](https://github.com/SAP-docs/btp-cloud-platform/blob/main/docs/10-concepts/trial-accounts-and-free-tier-046f127.md) corroborates the personal-use restriction and lifecycle.
- SAP. (n.d.-e). [Service plans and metering — SAP Business Application Studio](https://help.sap.com/docs/bas/sap-business-application-studio/commercial-information). SAP Help Portal.
- SAP. (n.d.-f). [On-device data storage](https://help.sap.com/docs/build-apps/service-guide/on-device-data-storage?campaigncode=CRM-XB23-MKT-DGEPDCST). SAP Help Portal.
- SAP. (n.d.-g). [Export a project — SAP Build](https://help.sap.com/docs/build-service/build-service-guide/export-project?locale=en-US). SAP Help Portal.
- SAP. (n.d.-h). [Importing projects — SAP Build Code](https://help.sap.com/docs/build_code/d0d8f5bfc3d640478854e6f4e7c7584a/2ada2be6bedd4cfc926a1347b87ebfe7.html?locale=en-US&state=PRODUCTION&version=SHIP). SAP Help Portal.
- SAP. (n.d.-i). [Creating an SAP Build app](https://help.sap.com/docs/SAP_BUSINESS_ONE_WEB_CLIENT/e6ac71d18c7543828bd4463f77d67ff7/da290c4c170f4740871dcab239727733.html?locale=en-US). *How to develop Web Client extensions*, version 10.0 SP 2605. SAP Help Portal. This is evidence about build output formats, not an instruction to use SAP Business One.
- SAP. (n.d.-j). [Formula binding for UI visibility in SAP Build Apps](https://developers.sap.com/concepts/formula-binding-sap-build/), [Data variable logic flow functions in SAP Build Apps](https://developers.sap.com/concepts/data-variable-logic-flow/), and [Page variables in SAP Build Apps](https://developers.sap.com/concepts/page-variables-sap-build/). SAP Developer Center.
- Wroblewski, D. (2026, July 20). [Consume a CAP service in SAP Build Apps](https://developers.sap.com/tutorials/build-apps-cap-app/), Step 2. SAP Developer Center. Originally created 22 August 2023; page displays the update date cited here.
