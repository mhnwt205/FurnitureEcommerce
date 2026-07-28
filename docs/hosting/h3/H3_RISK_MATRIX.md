# H3 Risk Matrix

| Risk | Finding IDs | Release treatment | Owner role | Evidence required to close |
|---|---|---|---|---|
| Critical | None | No Critical finding recorded from available evidence | — | — |
| High | H3-001, H3-002, H3-003, H3-004, H3-005 | Release blocker | Backend lead / DevOps / DBA | Clean audit triage, green isolated-DB tests, backend CI logs, Decimal migration rehearsal, migration backup/deploy record |
| Medium | H3-006, H3-007, H3-008, H3-009, H3-010, H3-011 | Must close or receive explicit risk acceptance before launch | Payments / Backend / Security / Operations | Environment-binding tests, upstream failure tests, upload binary/cleanup tests, dashboards/scale decision, CSP evidence, version-controlled runbooks |
| Low | H3-012, H3-013 | Schedule and track | Frontend lead | Budget report and warning-specific tests/decisions |

## Risk concentration

| Domain | Highest level | Finding IDs |
|---|---|---|
| Supply chain | High | H3-001 |
| Validation/CI | High | H3-002, H3-003 |
| Data integrity/migration | High | H3-004, H3-005 |
| Payment | Medium | H3-006 |
| AI/upload | Medium | H3-007, H3-008 |
| Operations/browser security/docs | Medium | H3-009, H3-010, H3-011 |
| Frontend quality | Low | H3-012, H3-013 |

## H3.1 status update

| Risk | Open findings after H3.1 | Treatment |
|---|---|---|
| Critical | None | None open |
| High | None | H3-001 through H3-005 closed with recorded evidence |
| Medium | H3-006 to H3-011 | Close or accept with accountable owner before release |
| Low | H3-012, H3-013; body-parser advisory | Track to a scheduled release |
