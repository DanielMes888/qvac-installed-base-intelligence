# Emergency demo scope status

Status: emergency core preserved; final owner rehearsal deferred by decision dated 2026-09-11

Checkpoint `demo-core-v1` preserves the owner-approved operational demo immediately before the bounded clarification workflow.

ADR 0006 authorizes a deadline-bounded prototype outside the failed E4 gate sequence. It does not mark E4 or E4-v2 as passed, complete Tickets 03–06, or unblock their full scope. The current implementation maps to only the following essential subsets.

| Original ticket | Emergency subset present | Full-ticket work still absent | Ticket status |
| --- | --- | --- | --- |
| 03 — Capture and QVAC drafts | Fictional customer selection; prohibited-input notice; original-note persistence before real local QVAC; compact validated Draft Claims with expanded source offsets; visible terminal failure with no admitted drafts | Multi-equipment canonical scenario; complete observation revision/author model; full atomic field/scope coverage; all Ticket 03 acceptance cases | Remains `blocked`; not complete |
| 04 — Clarify and review | At most one material Spanish question; answer, **No lo sé**, and omit outcomes; dated answer Evidence Entry; at most one final extraction; superseded initial drafts with both attempt records retained; reviewer correction of six approved fields with immutable QVAC values, audit metadata, and separate reviewer Evidence when needed; explicit review of the final set; safe terminal second-extraction failure; model output cannot assign Confirmed certainty | Unresolved/manual-entry flows; generalized semantic validation; restart recovery and the remaining full-ticket acceptance cases | Remains `blocked`; not complete |
| 05 — Reconcile | Evidence-based candidate suggestion; explicit link decision with actor, date, and reason; repeated evidence adds no equipment record | Full identity-state model; alternative provisional decisions; unidentified members; quantity comparability; conflicts, changes, and temporal behavior | Remains `blocked`; not complete |
| 06 — Working views | Separate verified/provisional seeded records; captured-note and unlinked counts; separately displayed observation/recorded/latest-evidence dates; deterministic Alta/Media/Baja verification priority with visible reasons, four filters, evidence relationships, and top-three default; limited whitelisted aggregate; continuous emergency path | Reported-total and scope views; resolution/dismissal lifecycle; complete customer evidence history; complete aggregate whitelist tests; full canonical scenario | Remains `blocked`; not complete |

The essential demo manual checks in [DEMO_GUIDE.md](DEMO_GUIDE.md) were not completed or approved. On 2026-09-11 the project owner deferred the full manual regression and final rehearsal until a separately planned five-feature Stretch Goal extension and general UI/UX integration are complete. This scheduling decision does not change the evidence below, approve the demo, or broaden the emergency subset itself.

ADR 0007 authorizes planning an attempt to add explainable Confidence scoring, bounded Opportunity identification, Natural-language analytics, Photo-assisted capture with fully local OCR, and Voice capture with fully local transcription. These are optional official Stretch Goals, not Minimum Viable Prototype requirements. The owner approved the separate implementation plan on 2026-09-11, but no extension implementation or ticket publication is authorized by this status document. The original twelve tickets remain in their recorded states; Ticket 02 and dependent tickets remain blocked. Cross-device synchronization remains deferred.

Automated readiness evidence on 2026-09-10:

- `npm.cmd test`: 50/50 passing after the v9 configuration and recorded-evidence scope checks.
- Reset/start: loopback server and every required page control loaded.
- QVAC v9 benchmark: 5/5 schema-valid, 5/5 semantic-checklist passes, zero unsupported identities or quantities, 4/4 explicit cases without a question, one useful ambiguity question, and five warm extractions between 578.72 and 855.50 ms. The four department cases retained `dept`; the ambiguous site case retained `site`.
- Real-QVAC primary smoke with v9: succeeded on GPU while the external network probe was unreachable; extraction took 558.78 ms, returned `dept` for Radiología, accepted all five supported claims, produced the expected candidate, and reconciliation kept Northbridge at two equipment records.
- Live port-4173 API path: saved one observation, produced and reviewed five Draft Claims, linked `nb-mri-01`, retained two Northbridge equipment records, exposed three verification items, and returned aggregate counts of three verified and two provisional records.
- Invalid-output test: saved the original observation, admitted zero Draft Claims, and changed neither accepted evidence nor equipment-record count.
- Controlled clarification tests: answer, omit, **No lo sé**, one-question/two-inference limits, second-inference failure, draft replacement, attempt metadata, Spanish-question filtering, and final human review passed.
- Controlled correction tests: all six approved fields, immutable QVAC value, audit metadata, reviewer Evidence, malformed-input rejection, correction followed by rejection, accepted final-value matching, and no automatic installed-base modification passed.
- Deterministic correction smoke: changed the controlled model value `DS-Zero` to `DS-One`, preserved both values and the source reference, required explicit acceptance, matched `nb-mri-01`, and retained two Northbridge equipment records. It is workflow evidence, not real-QVAC quality evidence.
- Deterministic freshness/priority smoke: preserved observation and recorded dates separately, exposed latest record evidence, produced explained Alta/Media/Baja items, exercised priority/customer/equipment/reason filters, retained evidence relationships, kept items Open after reconciliation, and retained the equipment-record count.
- Deterministic export/deletion smoke: validated `workspace-export-v1` before and after deletion; preserved stable provenance references; excluded internal invalid model output; required explicit confirmation; persisted an empty Workspace across restart; kept protected source, fixtures, tests, and both E4 failure reports unchanged; restored the synthetic seed only through the separate reset action; and recorded zero unexpected external requests.
- Real-QVAC clarification smoke with v9: the initial local GPU extraction produced one useful Spanish question in 768.09 ms; the answer was preserved as a separate Evidence Entry and the second inference completed in 760.54 ms. The application enforced one question/two inferences, conservative review admitted zero claims, and the installed base remained unchanged. The second model output did not apply the answer as an explicit total and retained unknown quantity scope; this remains a semantic limitation.
- Final reset: zero captured Northbridge observations and zero new evidence links.

## Deferred from the emergency subset

This list preserves the earlier emergency checkpoint's deferred work. The 2026-09-11 Stretch Goal plan authorizes only future planning units and does not implicitly authorize any item below.

- Observation-level deletion and its advanced recovery behavior.
- Packaging.
- Mobile execution.
- Full E7 evaluation.
- User experiments.
- Advanced interruption, stale-result, and manual-recovery behavior.
- Expanded dashboard, reported-total, conflict, history, and verification-lifecycle features.
- Cross-device synchronization, shared accounts, backend synchronization, and CRM ingestion.

No optional or deferred ticket should begin automatically after the readiness pass. The owner-approved future Stretch Goal units are defined in `docs/STRETCH_GOALS_IMPLEMENTATION_PLAN.md` and require separately published tickets before implementation.
