# Allow deletion to override provenance retention

Accepted during grill-with-docs round 5 (Q21). Although equipment edits preserve evidence history, explicit deletion removes the original observation and all application-managed content that depends exclusively on it, then recalculates affected views. A content-free marker may retain only the random observation ID, deletion timestamp, and deletion action. This chooses removal of accidentally sensitive input over complete provenance; the application cannot erase previously generated exports, external copies, operating-system backups, or forensic remnants and must not claim otherwise.

The prototype accepts fictional demonstration data only and warns users before capture. It does not detect sensitive information automatically. This decision does not establish production-grade retention, backup, or deletion compliance.
