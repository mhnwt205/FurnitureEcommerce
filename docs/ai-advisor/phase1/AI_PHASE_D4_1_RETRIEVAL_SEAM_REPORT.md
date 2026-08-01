# D4.1 — Candidate Retrieval Seam

D4.1 extracts the unchanged primary/fallback candidate retrieval order into `retrieveAdvisorCandidates`. It returns candidates plus internal primary/fallback metadata, is called once by the existing advisor pipeline, and does not enable clarification or alter response/ranking/enrichment behavior. Errors propagate unchanged. D4.2 can consume metadata without refetching candidates.
