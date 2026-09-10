# Philips Customer Installed Base Intelligence with QVAC

**Current status: Planning**

## Problem

Hospital equipment observations remain scattered across field employees' notes and memory. Incomplete, estimated, repeated, or contradictory reports can produce unreliable installed-base records without clear supporting evidence.

## Proposed solution

A private, offline-capable mobile application will turn natural-language visit reports into structured equipment claims, preserve uncertainty and provenance, and suggest matches for human review without automatically merging ambiguous records. The proposed stack is React Native with Expo and TypeScript, SQLite, and QVAC.

## Mandatory local inference

All evaluated AI inference must run locally through `@qvac/sdk`. Cloud inference must never be introduced. The core workflow must work without internet access.

## Authoritative plan

Read the [Official Project Plan](docs/OFFICIAL_PROJECT_PLAN.md) before planning or implementation. This repository currently contains planning and development-workflow setup only; application scaffolding and implementation have not started.
