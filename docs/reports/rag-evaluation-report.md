# RAG evaluation report

Generated: 2026-08-04  
Experiment: `8a03b880fe4d5cf10b4933d94592c2b8705bff794381f337fd0400ac776e6ee9`  
Dataset: `complete-rag-fixture` 1.0.0  
Dataset hash: `685eff649c42876159b54326bb187291fbe949095383f1d07372e4f655c28e12`  
Observation hash: `5d8852f5c65dd9594a4d2c6f0c19124ef9c07f4d3710def46c473dde14a7bc4c`  
Production rollout: **BLOCKED**

## Reproducible configuration

```json
{
  "name": "fixture-hybrid-v1",
  "chunkingVersion": "semantic-v2",
  "embeddingProvider": "fake",
  "embeddingModel": "deterministic-16",
  "embeddingVersion": "v1",
  "retrievalStrategy": "hybrid",
  "fusionStrategy": "rrf",
  "reranker": "deterministic-v1",
  "promptVersion": "grounded-v1",
  "k": 3,
  "lowScoreThreshold": 0.3,
  "seed": 42,
  "codeVersion": "fixture-2026-08-04"
}
```

The eight cases cover golden questions, expected sources and chunks, unanswerable and adversarial questions, multilingual retrieval, permission-sensitive access, and freshness-sensitive retrieval.

## Automated metrics

| Metric                   |    Result |
| ------------------------ | --------: |
| Recall at K              |    0.8750 |
| Precision at K           |    0.8125 |
| Mean reciprocal rank     |    0.5000 |
| NDCG                     |    0.8750 |
| Source hit rate          |    1.0000 |
| Citation correctness     |    1.0000 |
| Citation completeness    |    0.8750 |
| Groundedness             |    0.8750 |
| Answer relevance         |    0.9375 |
| Unsupported claim rate   |    0.1250 |
| Mean latency             | 146.25 ms |
| Embedding cost           |   $0.0082 |
| Generation cost          |   $0.0520 |
| No-answer accuracy       |    1.0000 |
| Zero-result rate         |    0.3750 |
| Low-score retrieval rate |    0.1250 |

## Mandatory gate failures

- Recall at K 0.8750 is below 0.9000.
- Groundedness 0.8750 is below 0.9000.
- Unsupported claim rate 0.1250 exceeds 0.0500.
- Low-score retrieval rate 0.1250 exceeds 0.0500.

## Human review

Status: not started. Reviewed cases: 0.

Human review is stored and reported independently. It is not blended into automated metrics or used to conceal automated gate failures.

## Quality statement

This deterministic fixture validates the evaluation framework and rollout gate. It does **not** establish production RAG quality. A production claim requires representative workspace datasets, completed human review, and a passing mandatory evaluation tied to the deployed configuration.
