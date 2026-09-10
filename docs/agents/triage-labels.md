# Local status vocabulary

Local Markdown files do not use external tracker labels. Their `Status:` field must contain exactly one of these values:

| Status | Meaning |
| --- | --- |
| `proposed` | Draft work awaiting a decision or approval. |
| `ready` | Approved and actionable; all declared blockers are done. |
| `blocked` | Cannot proceed because information, a decision, or another ticket is outstanding. |
| `in-progress` | Actively being worked. |
| `done` | Completed or otherwise closed; use a separate resolution when closure was not implementation. |

## Canonical skill-role mapping

Matt Pocock's skills sometimes refer to canonical triage roles. Translate them to the local vocabulary as follows:

| Canonical role | Local representation |
| --- | --- |
| `needs-triage` | `Status: proposed` |
| `needs-info` | `Status: blocked` with the missing information recorded |
| `ready-for-agent` | `Status: ready` |
| `ready-for-human` | `Status: ready` with `Owner: human` |
| `wontfix` | `Status: done` with `Resolution: not-planned` and a reason |

`in-progress` is the local execution state used after a ready ticket is claimed. A ticket with unfinished blocking edges remains `blocked`, even when a publishing skill describes generated tickets generally as agent-ready.
