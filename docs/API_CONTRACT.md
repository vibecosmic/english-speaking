# API boundary · draft 0

The first frontend prototype makes no backend calls and sends no audio over network.
Do not implement a fake live endpoint or bake a provider credential into a bundle.

Future contract review must define: version, opaque request ID/idempotency scope,
recording limits/accepted formats, consent, retention/deletion, timeout/retry behavior,
rate/size limits and a feedback evidence model. Distinguish transcript, pronunciation
assessment and teaching suggestion; represent uncertain/unavailable results explicitly.
Public schemas use synthetic examples. Authentication, providers and proprietary
assessment policy remain backend concerns. Interface changes require compatibility
review and linked tasks in both repositories before integration.
