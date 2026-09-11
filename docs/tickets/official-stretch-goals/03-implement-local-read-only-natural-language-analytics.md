# 03: Implement local read-only natural-language analytics

Type: Official Stretch Goal

Status: done

Implementation note (2026-09-11): deterministic tests and smoke passed, but the first real local smoke produced schema-valid plans that did not preserve the requested country, freshness, and normalized confidence semantics. That failure remains under `results/emergency/analytics-real-qvac-smoke-v1-failed.json`.

Bounded corrective note (2026-09-11): one approved corrective cycle added deterministic semantic anchoring and a separate analytical warmup without changing prompt v1 or extraction v9. The sole corrected real round passed and is retained under `results/emergency/analytics-real-qvac-smoke-v2-corrected.json`.

Owner validation note (2026-09-11): the owner approved Ticket 03 visually and functionally after observing correct modality aggregation, confidence normalization, removal of an unrequested grouping, an honest zero-result response, and visible filters, normalizations, sources, and local provenance. Known limitations remain the initial analytical warmup, the deliberately closed vocabulary, validation by one corrected real round, and zero results when the synthetic Workspace has no applicable data.

Specification: `docs/specs/philips-customer-installed-base-intelligence.md`

Plan: `docs/STRETCH_GOALS_IMPLEMENTATION_PLAN.md`

## Objective

Let a user ask bounded installed-base questions in natural language while local QVAC produces only an allowlisted structured query plan and deterministic code executes that plan against stored synthetic data.

## User-Observable Result

The user can submit a supported question, inspect the interpreted filters/aggregation, see deterministic results with provenance and limitations, and receive a rejection or one useful reformulation request when the question is outside the contract.

## Scope

- Create a versioned analytics contract and prompt independent from `prototype-equipment-extraction-v9`.
- Use real local `@qvac/sdk` inference only to interpret intent into an allowlisted structured plan.
- Allow only approved read-only fields, filters, groupings, sorts, limits, and aggregates.
- Validate the plan before deterministic execution; QVAC never supplies result rows or aggregate values.
- Reject unsupported, mutating, external-data, or unsafe queries, or ask for one bounded reformulation.
- Display interpreted scope, result provenance, freshness/confidence context, and empty-result behavior.

## Dependencies

Blocked by: None. Tickets 01 and 02 are `done`.

## Acceptance Criteria

- [ ] The analytics prompt, schema, version, and validation are separate from extraction prompt v9.
- [ ] Every evaluated interpretation uses local `@qvac/sdk` on the same computer with no cloud or delegated inference.
- [ ] Only allowlisted read-only plans execute; mutation, arbitrary code/SQL, external lookup, and unknown fields are rejected.
- [ ] Deterministic execution alone produces rows, counts, and aggregates from persisted data.
- [ ] Supported synthetic queries return reproducible results and show interpreted filters and evidence/freshness context.
- [ ] An out-of-contract query is rejected or receives at most one useful reformulation request; no result is invented.
- [ ] Invalid, truncated, or schema-invalid model output cannot execute.
- [ ] Existing QVAC extraction and reconciliation behavior remains unchanged.

## Automated Tests

- Schema and allowlist tests for every supported operator, field, aggregate, sort, and limit.
- Adversarial tests for writes, arbitrary SQL/code, prompt injection, external lookup, unknown fields, and fabricated values.
- Deterministic executor tests that bypass inference and assert exact results over synthetic fixtures.
- Adapter tests for invalid JSON/tool output, length stops, retries if approved by the contract, and refusal/reformulation behavior.
- Regression tests proving `prototype-equipment-extraction-v9` files, behavior, and snapshots are unchanged.

## Required Smoke

With the cached local model and networking unavailable, run supported synthetic questions covering geography, modality, age/freshness, confidence, and opportunity signals plus one unsupported question. Record the plan, validation, deterministic result, latency, and rejection/reformulation.

## Provenance, Safety, Offline Behavior, and Synthetic Data

- Persist no mutation from analytics. Log only the minimum synthetic query/evidence needed for reproducibility.
- Keep all inference and execution on the same computer; prohibit cloud services, delegated inference, telemetry-dependent results, and external enrichment.
- Results must cite stored synthetic records and expose uncertainty and freshness rather than converting reported data into confirmed fact.
- Do not describe the contract, query semantics, or result as an official Philips analytics rule.

## Stop Conditions

- Stop if the runtime cannot prove that a plan is read-only and allowlisted before execution.
- Stop if QVAC output is used as the answer instead of as a validated plan.
- Stop if offline local inference cannot run within the documented environment; preserve evidence and request owner direction.
- Stop before modifying prompt v9 or adding a cloud fallback.

## Expected Evidence Artifacts

- Versioned analytics prompt/schema and allowlist contract.
- Automated contract, security, deterministic-executor, and regression results.
- A machine-readable offline smoke record containing questions, plans, validation decisions, results, and latencies.
- A concise human-readable limitation and supported-query catalog.

## Explicit Non-Goals

- Free-form SQL, writes, external search, hidden enrichment, or autonomous analysis.
- Treating QVAC-generated prose as authoritative query results.
- Modifying QVAC extraction v9, its model/adapter, reconciliation, E4/E4-v2, or the original tickets.
- Claiming general-purpose analytics, production security, or Philips-approved business logic.
