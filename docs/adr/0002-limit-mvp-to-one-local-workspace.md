# Limit the MVP to one local workspace

Accepted during grill-with-docs, round 2 (Q6). The MVP is a single-user, single-device workspace: customer history and verification items support the same account manager's next visit, while observations from other fictional employees in the seed demonstrate prior evidence rather than device collaboration. This deliberately postpones synchronization, shared accounts, backend storage, and CRM ingestion to avoid assuming an unknown production integration and ownership model; the tradeoff is that the prototype cannot demonstrate immediate corporate visibility or automatic handoff to another visitor.

Structured export remains in the MVP as a record for future integration. Its creation and transfer behavior will be settled separately; export does not imply that an import path or corporate recipient exists.

The earlier platform clarification left interface and inference topology open. Round 4 now selects the Windows laptop as the first execution target, with Electron or a same-computer browser/native-host interface to follow validation; mobile is future work. [ADR 0003](0003-run-qvac-on-the-workspace-computer.md) excludes inference delegation, independently of the synchronization exclusions here.
