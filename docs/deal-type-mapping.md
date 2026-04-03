# Deal Type Mapping

Generated on: 2026-04-04 02:04:59
Source project: dozmqtzlinfqjrropipb
Target project: wvjcgtteblsjxcapanov

## Why this document exists

The pre-flight report found a schema mismatch between SOURCE application-level deal types and TARGET database-level allowed values. This mapping must be used before any cross-project data migration or data normalization work.

## SOURCE application-level deal types

- lending
- arbitrage
- partnership
- capital_placement
- general
- capital_transfer

## TARGET database allowed values

- loan
- investment
- general
- capital_transfer
- profit_share

## Required mapping

| SOURCE value        | TARGET value      | Notes |
|---------------------|-------------------|-------|
| lending             | loan              | Legacy naming mismatch |
| arbitrage           | investment        | Requires business validation before bulk migration |
| partnership         | profit_share      | Semantic alignment required |
| capital_placement   | capital_transfer  | Verify this is correct for your business rules |
| general             | general           | Direct match |
| capital_transfer    | capital_transfer  | Direct match |

## Values present in TARGET DB but not SOURCE TS types

- loan
- investment
- profit_share

## Risk

Rows containing SOURCE values like lending, rbitrage, partnership, or capital_placement will be rejected by TARGET's merchant_deals.deal_type CHECK constraint unless they are normalized first.

## Required follow-up

Before any data migration:
1. Confirm the mapping above with business logic owners.
2. Add a transform step in all migration/import scripts.
3. Reject unmapped values explicitly, do not coerce silently.