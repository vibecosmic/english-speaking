# English Speaking

A frontend for short English speaking practice: read a prompt, record, listen and try again.

Status: F001 recording prototype under review (not released, no physical-device test yet).
Recordings stay in browser memory only and the practice tip is a clearly labelled demo
suggestion for the sentence, not an analysis of the recording. No speech scoring or
learning outcome is claimed.

## Run locally

Requires Node.js 20.11 or newer. There are no packages to install.

```sh
npm ci            # installs nothing; verifies the committed lockfile
npm run check     # lint + unit tests + build into dist/
npm run serve     # http://localhost:5173/ serving dist/
npm run dev       # same server, serving the source tree directly
npm run typecheck # downloads the pinned TypeScript 6.0.3 via npx, then type-checks src/
```

Set `PORT=8080` to change the port. The server binds to 127.0.0.1 only and is for
local testing, not deployment.

## Browser and HTTPS limitations

- Microphone access needs a secure context: `https://` or `http://localhost`. Opening
  `index.html` as a file or over plain HTTP on a LAN address will show an
  "insecure page" message instead of recording. Testing on a phone needs HTTPS.
- Requires `getUserMedia` and `MediaRecorder` (current Chrome, Edge, Firefox, Safari).
  If either is missing the page explains that recording is unsupported.
- The recorded format depends on the browser (for example WebM/Opus or MP4/AAC).
  If the browser cannot play its own take, the page asks you to discard and retry.
- Takes stop automatically after 60 seconds. Hiding the tab or switching apps while
  recording abandons the take; nothing is kept.
- Recordings are never uploaded or saved. The page's Content Security Policy blocks
  network connections, discarding revokes the playback URL and stopping releases the
  microphone. Closing or reloading the tab loses the recording.

Start with PROJECT.md, ROADMAP.md, TASKS.md and AGENTS.md. Product planning and backend
implementation live in a separately managed private repository. Public issues and fixtures
must contain only generic examples. No production deployment or paid speech API is enabled.

License: the owner has not selected an open-source license yet. Public visibility alone
does not grant an open-source license; clarify licensing before redistribution/adoption.
