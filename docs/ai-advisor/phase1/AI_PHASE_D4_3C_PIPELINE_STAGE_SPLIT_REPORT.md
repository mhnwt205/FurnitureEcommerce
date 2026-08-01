# D4.3c — Pipeline Stage Split

Stage 1 (`prepareAdvisorCandidates`) performs current-product lookup, retrieval/fallback, promotion pricing and eligibility diagnostics only. Stage 2 (`completeAdvisorRecommendation`) consumes those artifacts for review aggregation, ranking, top-N and writer fallback. `getAdvisorPipelineArtifacts` and `getAdvisorResponse` remain wrappers over both stages. Clarification is not enabled by this phase.
