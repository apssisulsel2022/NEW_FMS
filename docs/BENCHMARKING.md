# Benchmarking & Query Plans

This repo provides a benchmarking harness for collecting query plans for the most critical read/write operations. The artifacts are designed for validating performance at >10k TPS and for verifying query/index changes against large datasets (100M+ rows in high-volume entities).

## What’s Included

- 25 critical operations SQL: [critical_operations.sql](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/scripts/db/critical_operations.sql)
- Explain runner (captures EXPLAIN output): [run_explain.ps1](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/scripts/db/run_explain.ps1)
- Data scale notes: [PERFORMANCE_TUNING.md](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/docs/PERFORMANCE_TUNING.md)

## Capturing Query Plans

Recommended:

- `EXPLAIN (ANALYZE, BUFFERS, VERBOSE, SETTINGS)`
- Run with production-like parameters: connection pooler, prepared statements, same search path, same RLS role

Output should be saved per environment (staging/prod-like) and per dataset size.

## TPS Benchmarking

For TPS, use:

- `pgbench` custom scripts that mirror:
  - match event ingestion (append-only writes)
  - standings reads (fan-out reads)
  - fixture lists (range reads)
  - media access logs (append-only writes)

The harness here focuses on correctness and plan stability. Exact TPS numbers depend on infrastructure (CPU, storage latency, network, pooling).

