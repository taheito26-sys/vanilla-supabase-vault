# Deal Type Mapping

## SOURCE application values
- lending
- arbitrage
- partnership
- capital_placement
- general
- capital_transfer

## TARGET database values
- loan
- investment
- general
- capital_transfer
- profit_share

## Mapping
| SOURCE | TARGET | Note |
|---|---|---|
| lending | loan | Legacy naming mismatch |
| arbitrage | investment | Validate business semantics |
| partnership | profit_share | Validate business semantics |
| capital_placement | capital_transfer | Validate business semantics |
| general | general | Direct match |
| capital_transfer | capital_transfer | Direct match |

## Warning
Do not migrate rows across projects without applying this mapping explicitly.
Reject unmapped values, do not coerce silently.