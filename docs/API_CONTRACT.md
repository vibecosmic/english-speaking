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

## Unified login boundary · accepted direction

The shared identity provider is the source of login identity. The proposed Web
integration delegates OIDC authorization-code/PKCE and token validation to the product
backend, which establishes an application session. The frontend initiates login and
reads session status; client secrets and provider tokens never belong in frontend
bundles or URLs/logs. Concrete application endpoints remain unspecified until the
backend contract is reviewed; do not invent a live endpoint.

The recording prototype has no login requirement or backend call. Login/session UI
gets a separate compatibility task after the backend contract exists. A local sign-out
must not be labeled a sign-out from all products. Use synthetic identity fixtures only.
