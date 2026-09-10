# Emergency demo scope status

Status: awaiting project-owner demo approval

Checkpoint `demo-core-v1` preserves the owner-approved operational demo immediately before the bounded clarification workflow.

ADR 0006 authorizes a deadline-bounded prototype outside the failed E4 gate sequence. It does not mark E4 or E4-v2 as passed, complete Tickets 03–06, or unblock their full scope. The current implementation maps to only the following essential subsets.

| Original ticket | Emergency subset present | Full-ticket work still absent | Ticket status |
| --- | --- | --- | --- |
| 03 — Capture and QVAC drafts | Fictional customer selection; prohibited-input notice; original-note persistence before real local QVAC; compact validated Draft Claims with expanded source offsets; visible terminal failure with no admitted drafts | Multi-equipment canonical scenario; complete observation revision/author model; full atomic field/scope coverage; all Ticket 03 acceptance cases | Remains `blocked`; not complete |
| 04 — Clarify and review | At most one material Spanish question; answer, **No lo sé**, and omit outcomes; dated answer Evidence Entry; at most one final extraction; superseded initial drafts with both attempt records retained; explicit review of the final set; safe terminal second-extraction failure; model output cannot assign Confirmed certainty | Correction/unresolved/manual-entry flows; generalized semantic validation; restart recovery and the remaining full-ticket acceptance cases | Remains `blocked`; not complete |
| 05 — Reconcile | Evidence-based candidate suggestion; explicit link decision with actor, date, and reason; repeated evidence adds no equipment record | Full identity-state model; alternative provisional decisions; unidentified members; quantity comparability; conflicts, changes, and temporal behavior | Remains `blocked`; not complete |
| 06 — Working views | Separate verified/provisional seeded records; captured-note and unlinked counts; top three seeded verification items; limited whitelisted aggregate; continuous emergency path | Reported-total and scope views; verification lifecycle/backlog; customer evidence history; complete aggregate whitelist tests; full canonical scenario | Remains `blocked`; not complete |

The essential demo awaits the manual checks in [DEMO_GUIDE.md](DEMO_GUIDE.md). Until the project owner approves that rehearsal, implementation remains limited to this emergency subset.

Automated readiness evidence on 2026-09-10:

- `npm.cmd test`: 30/30 passing after the bounded clarification workflow.
- Reset/start: loopback server and every required page control loaded.
- Real-QVAC smoke: succeeded with 60 output tokens on GPU while the external network probe was unreachable.
- Live port-4173 API path: saved one observation, produced and reviewed five Draft Claims, linked `nb-mri-01`, retained two Northbridge equipment records, exposed three verification items, and returned aggregate counts of three verified and two provisional records.
- Invalid-output test: saved the original observation, admitted zero Draft Claims, and changed neither accepted evidence nor equipment-record count.
- Controlled clarification tests: answer, omit, **No lo sé**, one-question/two-inference limits, second-inference failure, draft replacement, attempt metadata, Spanish-question filtering, and final human review passed.
- Real-QVAC clarification smoke: the initial local GPU extraction succeeded in 19.66 seconds, but `QWEN3_1_7B_INST_Q4` returned no clarification candidate. The smoke stopped before a second inference and remains failed evidence in `results/emergency/clarification-smoke.json`.
- Final reset: zero captured Northbridge observations and zero new evidence links.

## Deferred until essential-demo approval

- Workspace export.
- Observation deletion.
- Packaging.
- Mobile execution.
- Full E7 evaluation.
- User experiments.
- Advanced interruption, stale-result, and manual-recovery behavior.
- Expanded dashboard, reported-total, conflict, history, and verification-lifecycle features.

No optional or deferred ticket should begin automatically after the readiness pass.
