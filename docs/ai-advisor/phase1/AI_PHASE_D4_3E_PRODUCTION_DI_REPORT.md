# D4.3e — Production Dependency Injection

`prepareAdvisorCandidates` and `completeAdvisorRecommendation` now accept optional dependency objects with frozen production defaults. Direct tests inject the actual production stages and prove Stage 1 calls retrieval/enrichment/eligibility only, while Stage 2 calls reviews/rank/select/writer only. Public callers omit dependencies and retain default behavior. Clarification remains disabled.
