# Vector index corruption runbook

Owner: `[Search/RAG lead]`

1. Disable switching and writes to the suspect index version; preserve retrieval traces, index definition/version, model dimension, embedding version, and evaluation results.
2. Route reads to the last ready compatible index using the documented dual-read/rollback control. Never mix dimensions or remove tenant filters.
3. Verify authoritative chunks and embeddings in MongoDB. If embeddings are valid, rebuild the Atlas Vector Search index; otherwise run a bounded re-embedding job into a new version.
4. Wait for Atlas readiness, validate dimensions/filter definitions, run tenant-isolation tests and mandatory retrieval evaluation, then dual-read against production traffic samples.
5. Switch only after evaluation thresholds pass. Retain the previous index until the rollback window expires.
