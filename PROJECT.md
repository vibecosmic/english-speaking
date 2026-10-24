# English Speaking · Frontend

Logical AOS project: english-speaking. Component: frontend. Visibility: public.

## Goal
Validate a short practice loop: prompt → recording → playback → one actionable
practice suggestion → retry. First modes: text reading and text with an optional
verified example recording. Use generic synthetic examples only.

## Initial scope
Responsive browser prototype; this is a reversible starting proposal, not a native
app or app-store commitment. Microphone access requires HTTPS or localhost.
No backend dependency for recording/playback; no audio upload, persistent storage,
account, payments or realtime AI coach in the first prototype.
Example audio must have a verified license; hide unavailable examples rather than
pretending a generated recording exists. Demo feedback is visibly labeled.

## Acceptance
Recording, playback, discard and retry work on a real target device before release.
Permission denial, no supported recording API, silence and interruptions have an
honest recovery path. Stop tracks and revoke object URLs on discard/unmount.
Do not infer pronunciation errors from transcripts. Do not claim speech analysis
before an independently verified service is connected with authorized costs.

## Boundaries
Private product facts, learner profiles, raw discussions, real recordings, secrets
and private research never belong in this public repository or its CI logs.
Frontend contracts expose no proprietary backend implementation or credentials.
Each formal release requires a Human Operator experience notification with preview,
version, test focus and feedback route. No deployment is authorized by this charter.

## Unified identity

When account-backed features are introduced, authentication uses the shared account
service through standard OIDC. Do not build product-specific registration, password,
verification-code or social-login systems. The current memory-only recording prototype
remains usable without login. Backend-owned session integration is a separate task;
no login flow or identity deployment has been verified by this document.
