# Phase D3 — Orchestration State

D3 adds an internal adapter that invokes the D1 policy with merged intent and existing session clarification state. Production passes `candidateCount: null`, performs no query, and still returns the unchanged advisor response. State is committed only after advisor success and generation-current validation; clarify/no-result records an attempt while recommendation resets the state. The adapter defensively prevents a third clarify. D4 can add candidate summary and response contract deliberately.
