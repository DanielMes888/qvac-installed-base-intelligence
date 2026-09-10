# Installed-Base Evidence

The domain of equipment information captured during customer visits and the evidence-backed working view built from it. This view is not Philips' official inventory or system of record.

## Language

**Field Account Manager / Sales Representative**:
The hypothetical primary MVP user who records a short equipment observation note immediately after a visit. This persona does not imply a validated Philips workflow.
_Avoid_: Validated Philips user

**Equipment Observation Note**:
The user's narrative of medical equipment they observed or were told about during a customer visit. It is limited to equipment information and is not a complete sales visit note, CRM activity, or service report.
_Avoid_: Complete visit note, replacement CRM report

**Observation**:
A captured report from a visit that provides equipment evidence, potentially including direct observations and statements attributed to hospital staff. An observation does not itself establish a new asset or a complete inventory.
_Avoid_: Inventory entry

**Observation Revision**:
A monotonically increasing version of a saved observation used to prevent an older extraction result from overwriting newer manual work or accepted evidence.

**Claim**:
A statement about equipment with supporting evidence, provenance, and a certainty state. Its subject may be a group or an unidentified member rather than an identified asset.
_Avoid_: Confirmed fact

**Atomic Scoped Claim**:
The unit used to evaluate extraction: one claim type and value together with every applicable subject attachment, quantity scope, location scope, source type, certainty, and supporting-evidence reference. A correct value attached to the wrong subject is an incorrect atomic scoped claim.

**Draft Claim**:
A QVAC-generated interpretation awaiting explicit user review. It does not affect the installed-base working view, counts, discrepancies, or aggregates.

**Accepted Claim**:
A generated claim the user has explicitly judged to represent the available statement. Acceptance establishes interpretation, not factual truth or verified identity.
_Avoid_: Confirmed claim

**Observed Group**:
A collection of equipment described together in an observation, with an observed quantity and any claims applying to the group. Group membership alone does not establish the identities of its members.

**Verified Individual Asset**:
A unit whose identity matches an explicitly trusted fictional reference record in the seed. This demonstrates synthetic identity verification only; it does not establish real-world identity, current installation, or the certainty of other fields.
_Avoid_: Identified asset, fully confirmed equipment record

**Provisional Individual Asset**:
A record of an apparently distinguishable physical unit whose identity has not been verified against a trusted reference, even if an identifier has been reported. The record is provisional; its existence does not prove a distinct unit.
_Avoid_: Verified asset

**Provisional Record Count**:
The number of explicitly created provisional individual records in the local workspace. It excludes unresolved observations and does not measure distinct equipment.
_Avoid_: Distinct equipment count

**Trusted Fictional Reference**:
A seeded, inspectable reference explicitly designated as trusted for the synthetic identity-verification demonstration. It is not a real hospital's authorized inventory or evidence of real equipment.

**Synthetic Universe**:
The documented set of fictional organizations, hospitals, manufacturers, models, identifiers, people, and locations used consistently across the application seed, datasets, screenshots, exports, results, and demonstration. Generic equipment modalities may use their real category names.

**Unlinked Equipment Claim**:
Equipment evidence without enough information to establish a distinct physical unit. It is not an individual asset record.

**Unidentified Member Claim**:
A claim applying to an unspecified member of an observed group, such as the approximate age of one of three scanners. It does not apply to every member and is not linked to a particular asset without sufficient identity evidence.
_Avoid_: Identified asset

**Observed Quantity**:
The quantity of equipment the reporter states they observed within the described scope. It does not imply the hospital's complete inventory.
_Avoid_: Hospital total

**Reported Total**:
A source's claim about the complete equipment quantity, supported by explicit completeness language or a clarifying answer. Its location scope is separately established, and it remains separate from asset record counts.
_Avoid_: Verified inventory total

**Quantity Scope**:
Whether a stated number represents an observed quantity, a reported total, or an unknown scope. Customer selection and source attribution alone do not establish quantity completeness.

**Location Scope**:
The site, campus, department, or organizational extent to which a claim applies when that extent is established. It is separate from quantity scope and the selected customer context.

**Count Discrepancy**:
A numerical difference between comparable equipment counts with matching customer, site, applicable organizational scope, modality, relevant time basis, and compatible count meanings. It does not establish that equipment is missing.
_Avoid_: Missing asset count

**Information Source**:
The origin of a claim: direct observation, attributed staff statement, unattributed statement, existing authorized record, or supporting document/equipment label. Source type is distinct from the claim's certainty.

**Certainty Status**:
The evidentiary qualification of an individual claim: Reported, Estimated, Confirmed, or Unknown. It is separate from information source and equipment identity.

**Reported**:
Explicitly stated information without independent verification. The statement can describe either direct observation or information received from someone else.

**Estimated**:
Information expressed as approximate or uncertain, including an approximation attributed to another person.

**Confirmed**:
Information supported by inspectable evidence under explicit verification rules. User approval of an interpretation and repeated agreement alone do not confer this status.

**Unknown**:
Information not stated or not determinable from the available evidence.

**Recorded Time**:
When evidence was captured or a revision was recorded. It does not establish when the reported state applied.

**Effective Time**:
When a statement applies, if explicitly supplied by its source. It remains unknown when the evidence does not establish it.

**Potential Conflict**:
Incompatible claims concerning a comparable scope and period. Both claims remain visible with their evidence.

**Possible Change**:
Different values applying at different times without enough explanation to establish the transition.

**Reported Change or Correction**:
A source's explicit explanation of a transition or revision of an earlier statement. It can support a newer reported state or supersession without erasing the earlier evidence.

**Evidence Entry**:
An attributed, dated correction or follow-up answer related to an original observation. It supports claims containing information absent from or different from the original note.

**Extraction Correction**:
A correction of the application's interpretation of the original note. The corrected claim remains supported by the original excerpt, with the correction retained in history.

**Revised Assertion**:
New or changed information supplied by the user rather than a correction of extraction. It has its own supporting evidence and does not automatically increase certainty.

**Human-Authored Claim**:
An equipment claim entered manually by the user, with its own provenance and appropriate certainty. It is distinct from successful AI extraction, including when entered to recover from an extraction failure.

**Extraction Attempt**:
A single QVAC processing attempt tied to an observation ID and revision, with its own identity, start time, and status. Only the active attempt for the current revision may contribute draft claims.

**Stale Extraction Result**:
An inference result from an inactive attempt or older observation revision. It cannot overwrite manual work, create claims, or affect the working view.

**Clarification Target**:
A material uncertainty in an equipment observation that a single follow-up could resolve, such as quantity completeness, location scope, claim attachment, or a distinguishing identity detail. It is not every missing field in a record.

**Provisional Match Decision**:
An explicit judgment that an observation concerns an existing provisional record, with the actor, date, and reason retained. It is distinct from accepting extraction and does not verify physical identity.

**Installed-Base Working View**:
A local evidence-backed view that separately presents verified asset records, provisional records, and reported totals, including dates, uncertainty, and unresolved differences. It is not an audited current inventory or a shared corporate view.
_Avoid_: Official inventory, system of record

**Verification Item**:
Unresolved equipment information retained for the same account manager to investigate before or during their own future visit. This is an intended responsibility, not an established Philips governance process.
_Avoid_: Sales opportunity

**Open Verification Item**:
A material issue still awaiting evidence or a reconciliation decision. The customer view shows its three highest-priority open items by default.

**Resolved Verification Item**:
An item closed by linked new evidence or an explicit reconciliation decision. Passage of time alone cannot resolve it.

**Dismissed Verification Item**:
An item removed from the active list by a recorded actor, date, and reason. Dismissal preserves history and does not verify the underlying fact; new evidence may reopen it or create a related item.

**Workspace Export**:
A versioned JSON snapshot created locally by explicit user action, preserving stable references among the synthetic workspace records. It is not an upload, import format, collaboration mechanism, or claim of CRM compatibility.

**Gold Annotation**:
The project-owner-approved expected atomic scoped claims for an evaluation note, frozen before model output is examined. An ambiguity remains unknown or unresolved when the source does not support a unique answer.

**Held-Out Evaluation Set**:
The frozen synthetic notes and gold annotations withheld from case-specific prompt adjustment until the final evaluation. A rerun after any gold or implementation change must retain the first result and be labeled as a rerun or use a new untouched version.

**Deletion Marker**:
A content-free record containing only a random observation ID, deletion timestamp, and deletion action after explicit observation deletion. It preserves no text, extracted values, excerpts, content hash, or dependent evidence.
