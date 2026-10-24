# Frontend Agent contract

Read PROJECT.md, ROADMAP.md, TASKS.md, docs/API_CONTRACT.md and current AOS role policy.
Pick one eligible Issue for your role when idle and subscription quota is available.
Follow the AOS GitHub advisory claim protocol: fresh comments/PR check, stable request
ID, short wait and recheck, bounded heartbeat, pause on quota exhaustion. No task
preassignment and no separately billed model API fallback. Task Issues use aos:task;
aos:hold blocks dependency work. Read raw state even when derived labels are absent.

Work on an independent branch, create a PR, run relevant tests and report evidence.
Use latest stable supported tools; pin resolved dependencies and commit the lockfile.
No production deployment, paid service or automatic merge service. Public PRs must
contain no private family context, private links copied from source, recordings or
secrets. Use only generic examples. Backend changes get a linked private task; never
publish private task text. Confirm contracts and version compatibility before changing.
