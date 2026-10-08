# Enterprise Readiness

This page records what the SDK repository verifies and what requires platform,
security, or service-owner evidence. Repository checks alone do not qualify the
Frontal platform for a customer's production or procurement requirements.

## Verified in this repository

- CI builds, type-checks, lints, tests, checks documentation examples, and
  enforces an aggregate coverage threshold.
- Built ESM and CommonJS entries for service and unified SDK packages are loaded
  by Node 22 and 24 LTS in CI. The test toolkit is excluded because it
  imports Vitest and requires an active test runner. The webhook verifier is
  exercised through both package formats.
- npm publishing uses GitHub OIDC trusted publishing and provenance.
- The shared transport supports timeouts, request IDs, typed errors, telemetry,
  streaming, and caller-provided `fetch` implementations.

These are SDK engineering controls. They do not establish backend availability,
tenant isolation, data handling, or a vendor security certification.

## Open qualification items

### API contracts

The current [SDK migration matrix](../contracts/reports/migration-matrix.md)
records endpoints that do not match the checked-in public OpenAPI contracts.
For example, the report currently maps 0 of 13 agents endpoints, 1 of 59 auth
endpoints, and 0 of 23 billing endpoints. Matrix freshness is checked in CI,
but these unmatched operations are not currently a release-blocking error.

The SDK repository does not contain authoritative backend schemas for these
operations. Service owners need to publish the request, response, error, and
authentication contracts, then update the OpenAPI source and conformance gate.
Until then, those operations remain unverified against the published contract.
The configured OpenAPI sync URL returned HTTP 404 during this review, and the
private AI gateway source checkout was unavailable. `contract:sync` now accepts
`FRONTAL_OPENAPI_URL` and validates the fetched document before writing files;
service owners still need to provide the canonical URL and gateway checkout.

### Package support

Support is per package version. Packages below 1.0 are preview releases with no
enterprise support or availability commitment, even when installed through the
1.x unified SDK. See the [security policy](./SECURITY.md).

### Vendor assurance and operations

The SDK source does not include or verify platform-level assurance materials.
Enterprise qualification should use the current vendor materials for:

- Independent audit reports and scope, such as a SOC 2 report if available
- Data processing terms, subprocessors, retention, deletion, and residency
- Availability targets, support hours, escalation paths, and incident notices
- Penetration-test summaries and vulnerability response commitments
- Authentication, tenant isolation, encryption, and backup controls

Do not infer these platform controls from SDK features or repository policy
text. Request the current evidence from the Frontal service and security owners.

### Runtime scope

The Node CI matrix verifies package loading and webhook verification from built
ESM and CommonJS artifacts. Edge deployment environments are not covered by a
runtime CI matrix; validate the target provider's Web Crypto, Fetch, and
environment configuration behavior before relying on that deployment model.
The package engine floor of Node 18 is a compatibility declaration, not a
recommendation to deploy an end-of-life runtime. CI tests maintained Node LTS
releases; production deployments should use a runtime shown as supported on the
[Node.js release schedule](https://nodejs.org/en/about/previous-releases).

## Production rollout gate

Before a mission-critical rollout, customers and service owners should agree on
the supported package versions, close or formally accept the relevant API
contract gaps, complete a staging end-to-end integration, and review the vendor
assurance and operational materials above.
