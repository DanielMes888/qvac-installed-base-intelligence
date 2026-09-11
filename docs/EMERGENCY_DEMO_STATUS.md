# Emergency demo scope status

Status: awaiting project-owner demo approval

Checkpoint `demo-core-v1` preserves the owner-approved operational demo immediately before the bounded clarification workflow.

ADR 0006 authorizes a deadline-bounded prototype outside the failed E4 gate sequence. It does not mark E4 or E4-v2 as passed, complete Tickets 03–06, or unblock their full scope. The current implementation maps to only the following essential subsets.

| Original ticket | Emergency subset present | Full-ticket work still absent | Ticket status |
| --- | --- | --- | --- |
| 03 — Capture and QVAC drafts | Fictional customer selection; prohibited-input notice; original-note persistence before real local QVAC; compact validated Draft Claims with expanded source offsets; visible terminal failure with no admitted drafts | Multi-equipment canonical scenario; complete observation revision/author model; full atomic field/scope coverage; all Ticket 03 acceptance cases | Remains `blocked`; not complete |
| 04 — Clarify and review | At most one material Spanish question; answer, **No lo sé**, and omit outcomes; dated answer Evidence Entry; at most one final extraction; superseded initial drafts with both attempt records retained; reviewer correction of six approved fields with immutable QVAC values, audit metadata, and separate reviewer Evidence when needed; explicit review of the final set; safe terminal second-extraction failure; model output cannot assign Confirmed certainty | Unresolved/manual-entry flows; generalized semantic validation; restart recovery and the remaining full-ticket acceptance cases | Remains `blocked`; not complete |
| 05 — Reconcile | Evidence-based candidate suggestion; explicit link decision with actor, date, and reason; repeated evidence adds no equipment record | Full identity-state model; alternative provisional decisions; unidentified members; quantity comparability; conflicts, changes, and temporal behavior | Remains `blocked`; not complete |
| 06 — Working views | Separate verified/provisional seeded records; captured-note and unlinked counts; separately displayed observation/recorded/latest-evidence dates; deterministic Alta/Media/Baja verification priority with visible reasons, four filters, evidence relationships, and top-three default; limited whitelisted aggregate; continuous emergency path | Reported-total and scope views; resolution/dismissal lifecycle; complete customer evidence history; complete aggregate whitelist tests; full canonical scenario | Remains `blocked`; not complete |

The essential demo awaits the manual checks in [DEMO_GUIDE.md](DEMO_GUIDE.md). Until the project owner approves that rehearsal, implementation remains limited to this emergency subset.

Automated readiness evidence on 2026-09-10:

- `npm.cmd test`: 47/47 passing after the bounded local export and Workspace-deletion workflow.
- Reset/start: loopback server and every required page control loaded.
- Real-QVAC smoke: succeeded with 60 output tokens on GPU while the external network probe was unreachable.
- Live port-4173 API path: saved one observation, produced and reviewed five Draft Claims, linked `nb-mri-01`, retained two Northbridge equipment records, exposed three verification items, and returned aggregate counts of three verified and two provisional records.
- Invalid-output test: saved the original observation, admitted zero Draft Claims, and changed neither accepted evidence nor equipment-record count.
- Controlled clarification tests: answer, omit, **No lo sé**, one-question/two-inference limits, second-inference failure, draft replacement, attempt metadata, Spanish-question filtering, and final human review passed.
- Controlled correction tests: all six approved fields, immutable QVAC value, audit metadata, reviewer Evidence, malformed-input rejection, correction followed by rejection, accepted final-value matching, and no automatic installed-base modification passed.
- Deterministic correction smoke: changed the controlled model value `DS-Zero` to `DS-One`, preserved both values and the source reference, required explicit acceptance, matched `nb-mri-01`, and retained two Northbridge equipment records. It is workflow evidence, not real-QVAC quality evidence.
- Deterministic freshness/priority smoke: preserved observation and recorded dates separately, exposed latest record evidence, produced explained Alta/Media/Baja items, exercised priority/customer/equipment/reason filters, retained evidence relationships, kept items Open after reconciliation, and retained the equipment-record count.
- Deterministic export/deletion smoke: validated `workspace-export-v1` before and after deletion; preserved stable provenance references; excluded internal invalid model output; required explicit confirmation; persisted an empty Workspace across restart; kept protected source, fixtures, tests, and both E4 failure reports unchanged; restored the synthetic seed only through the separate reset action; and recorded zero unexpected external requests.
- Real-QVAC clarification smoke: the initial local GPU extraction succeeded in 19.66 seconds, but `QWEN3_1_7B_INST_Q4` returned no clarification candidate. The smoke stopped before a second inference and remains failed evidence in `results/emergency/clarification-smoke.json`.
- Final reset: zero captured Northbridge observations and zero new evidence links.

## Deferred until essential-demo approval

- Observation-level deletion and its advanced recovery behavior.
- Packaging.
- Mobile execution.
- Full E7 evaluation.
- User experiments.
- Advanced interruption, stale-result, and manual-recovery behavior.
- Expanded dashboard, reported-total, conflict, history, and verification-lifecycle features.

No optional or deferred ticket should begin automatically after the readiness pass.
