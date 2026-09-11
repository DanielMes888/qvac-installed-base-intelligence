# 04: Implement Geographic Installed-Base Map

Type: Optional Expected-Output Experience

Status: ready

Specification: `docs/specs/philips-customer-installed-base-intelligence.md`

Plan: `docs/STRETCH_GOALS_IMPLEMENTATION_PLAN.md`

## Objective

Add a local, offline geographic exploration of the synthetic installed base without presenting it as a ninth Stretch Goal or implying geographic precision absent from stored data.

## User-Observable Result

Users can explore `Región → País → Ciudad → Cliente → Equipos instalados`, inspect permitted modality/geography aggregates, and open the corresponding Customer 360 through either a schematic visualization or an equivalent accessible hierarchy.

## Scope

- Use only fictional customers, synthetic locations, and installed Equipment Records already stored locally.
- Provide a local schematic map, owned SVG, or simplified geographic visualization with no remote tiles or assets.
- Provide an equivalent keyboard-accessible list/tree hierarchy.
- Aggregate only allowlisted counts by geography and modality and link customer nodes to the existing Customer 360.
- Display the geographic level actually known and label missing/lower precision explicitly.
- Recalculate as a read-only view without QVAC inference or Equipment Record mutation.

## Dependencies

Blocked by: None. Ticket 03 is `done`.

## Owner Scope Decision, 2026-09-11

- Support a multinational synthetic installed base while making Panama the primary demonstration focus.
- When applicable geography exists, prioritize Panama in the initial view and place most located synthetic customers there.
- Retain at least one synthetic international customer, preferably in Brazil.
- Preserve existing customer identifiers and equipment counts. Use clearly fictional names and no real or confidential hospital, address, equipment-location, or Philips data.
- Represent absent geography explicitly as `Ubicación no especificada`; never confuse customer geography with a claim's `quantityScope` or Location Scope.

## Acceptance Criteria

- [ ] Region, country, city, customer, and installed-equipment levels are navigable when corresponding synthetic data exists.
- [ ] Aggregations use only allowlisted stored geography/modality fields and match deterministic customer/equipment counts.
- [ ] A user can reach the matching Customer 360 without losing customer context.
- [ ] The visual and accessible hierarchy expose equivalent information and keyboard/focus behavior.
- [ ] Missing city/country/region remains unknown; no coordinate or precision is invented.
- [ ] No tiles, geocoding, external map service, remote asset, real Philips location, QVAC call, or Workspace mutation occurs.
- [ ] Synthetic-data, provenance, certainty, freshness, and limitation labels remain visible.
- [ ] The initial applicable view prioritizes Panama, most located synthetic customers are in Panama, and at least one clearly fictional international case remains visible.

## Automated Tests

- Deterministic hierarchy and aggregation tests for region/country/city/customer/modality, missing levels, and stable ordering.
- Navigation tests from visual and hierarchy nodes to Customer 360.
- Accessibility tests for names, roles, keyboard traversal, focus visibility, and equivalent content.
- Security/network tests proving no external URL, tile, geocoder, QVAC call, or mutation.
- Regression tests for installed-base counts, provenance, freshness, confidence, opportunities, and analytics.

## Required Smoke

With networking unavailable, explore a synthetic multi-region fixture through visual and hierarchy paths, validate exact aggregates, open a Customer 360, exercise a missing-geography case, and record zero QVAC calls, zero external requests, and zero Equipment Record changes.

## Provenance, Safety, Offline Behavior, and Synthetic Data

- Every label and aggregate derives from stored synthetic customer/equipment data and names its available geographic level.
- All visualization assets and processing remain local; cloud, delegated inference, tiles, telemetry, and geocoding are prohibited.
- The map is schematic unless exact synthetic coordinates are explicitly supplied; it never implies real-world Philips coverage or precision.

## Stop Conditions

- Stop if the view requires external tiles, geocoding, remote assets, real customer locations, or inferred coordinates.
- Stop if geography cannot be presented without overstating precision or hiding unknown levels.
- Stop if navigation or aggregation would mutate records or call QVAC.
- Preserve failures rather than hard-coding a misleading demonstration.

## Expected Evidence Artifacts

- Automated hierarchy, aggregation, accessibility, navigation, and no-network results.
- Machine-readable offline smoke with inputs, exact aggregates, traversal, Customer 360 target, and zero-mutation assertions.
- Human-readable note describing geographic granularity, schematic limitations, and synthetic-only scope.

## Explicit Non-Goals

- Real Philips/customer geography, GPS accuracy, geocoding, routing, territory planning, or market coverage.
- Remote map tiles, cloud services, delegated inference, QVAC interpretation, or production GIS.
- Editing customer geography or Equipment Records.
- Treating this expected-output option as a ninth official Stretch Goal or a minimum challenge requirement.
