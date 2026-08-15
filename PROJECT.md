# LogicMantra IDE — Project Documentation

Detailed engineering documentation for the **LogicMantra IDE** project.

- **Product**: LogicMantra IDE — "Next-gen IDE for parallel agentic development"
- **Origin**: rebranded + extended fork of `stablyai/orca` (v1.4.178-rc.2)
- **Remote**: https://github.com/Gagan-k0/IDE.git
- **Package**: `logicmantra-ide@1.4.178-rc.2` (bin: `orca` / `logicmantra`, `node >= 24`)
- **License**: MIT (see `LICENSE`)

> ⚠️ **Before editing anything, read `brain.md` top-to-bottom.** It carries the full project
> state. Update it after every milestone so work never restarts from scratch.

---

## 1. Project map

| Path | Role |
|---|---|
| `src/main/` | Electron main process — IPC handlers, windows, app menu, tray, baton daemon manager |
| `src/main/ipc/baton.ts` | Baton IPC handler registration (availability / setup / status) |
| `src/main/ipc/baton-daemon.ts` | Baton daemon lifecycle: root resolution, probe, kill, start, stop |
| `src/main/ipc/baton-daemon-process.ts` | Baton process plumbing: captureCommandOutput, daemon probe, port/PID, kill, wait helpers |
| `src/main/ipc/baton-skill-install.ts` | Auto-installs the Baton skill catalog on start + install summary state |
| `src/preload/` | Preload bridge; `window.api.baton.*` typed surface |
| `src/shared/baton-types.ts` | Shared Baton types + `BATON_DAEMON_URL` constants |
| `src/renderer/src/components/settings/BatonPane.tsx` | Settings → Baton UI |
| `src/renderer/src/i18n/locales/` | en / es / ja / ko / zh catalogs (no-BOM, CRLF) |
| `config/` | Build + verification scripts, electron-builder, vitest, oxlint, i18n tooling |
| `resources/` | Logo, icons (icon.png/ico/icns), tray, onboarding media |
| `native/` | Native modules (windows-native-registry, …) |
| `mobile/` | Mobile companion app (iOS / Android) |
| `docs/` | STYLEGUIDE + allow-listed reference docs only (see `.gitignore`) |
| `brain.md` | Living project memory (mandatory read + update) |
| `PROJECT.md` | This file |

---

## 2. Stack

- **Electron** desktop shell (electron-vite build).
- **React + TypeScript** renderer with a Zustand-style store (`useAppStore`).
- **shadcn/ui** primitives + design tokens in `src/renderer/src/assets/main.css`.
- **i18next**-style catalogs (`t` / `translate`), 5 locales.
- **Vitest** unit/integration tests (`config/vitest.config.ts`), **oxlint** linting.
- **Baton CLI** (`baton-cli` 0.0.1) as an external, globally-installed coordination daemon.

---

## 3. Build & verification commands

```bash
pnpm install                          # 1280+ packages; needs VS 2022 Build Tools on Windows
pnpm run typecheck                    # node + cli + web tsconfigs
pnpm exec oxlint                      # lint
pnpm run verify:localization-catalog  # en.json key parity vs source + other locales
pnpm run verify:localization-extraction
pnpm run verify:localization-coverage
pnpm run build:win                    # full Windows build
```

**Windows build outputs** (`dist/`):

- `logicmantra-windows-setup.exe` (~188 MB NSIS installer)
- `win-unpacked/LogicMantra.exe` — exe `VersionInfo` shows FileDescription/ProductName =
  "LogicMantra IDE", CompanyName = "logicmantra"
- `latest.yml`, `.blockmap`, `builder-debug.yml`

Platform naming:

| Surface | Value |
|---|---|
| `productName` (electron-builder) | `LogicMantra IDE` |
| `win.executableName` | `LogicMantra` (exe has no space; the space lives in productName) |
| Linux `executableName` / `StartupWMClass` | `logicmantra-ide` |
| Artifact names | `logicmantra-windows-setup.*`, `logicmantra-macos-<arch>.*`, `logicmantra-linux*.` |

---

## 4. Baton integration (Settings → Baton)

### 4.1 Purpose

Baton coordinates multiple AI coding agents on one git repo — isolated worktrees, a realtime
dashboard, a **code knowledge graph**, and session handoff. The IDE makes it one click:
setup for the open folder, start the daemon, open the dashboard.

### 4.2 Key facts (do not re-derive)

- Installed globally via `npm link`: `C:\Users\lenovo\AppData\Roaming\npm\baton.cmd`,
  `baton --version` = 0.0.1. Node v24.16.0, git 2.51.0, uv 0.11.28. tmux **not** installed
  (dashboard terminal sessions unavailable).
- Non-interactive setup: `baton setup --yes --local --serve <folder>`.
- Daemon: `baton serve --write -p 7077` binds `127.0.0.1:7077` only; the dashboard is served
  from the same process; `GET /api/meta` reports `{ repo, branch, version, pid?, hub, … }`.
- **The daemon serves the repo it resolves from its own cwd** (`resolveBatonRoot()` in
  `src/server.ts`): nearest `.baton` walking up, else the git root.

### 4.3 The "wrong knowledge graph" bug and its fix (2026-08-15)

**Symptom**: after Baton setup, the dashboard showed the knowledge graph of a *different*
folder than the one open in the IDE.

**Root cause**: `startDaemon` reused **any** daemon already listening on `127.0.0.1:7077`
without checking what folder it served. A pre-existing daemon (e.g. one started earlier for
`Baton-Multi-Agent-`) kept serving *its* folder's graph — so the IDE dashboard showed the wrong
knowledge graph.

**Fix** (`src/main/ipc/baton-daemon.ts`):

1. `probeDaemonMeta()` — `GET /api/meta` to learn what repo + pid (if any) the running daemon
   serves.
2. `resolveBatonRootFor(folderPath)` — mirrors Baton's `resolveBatonRoot`: nearest `.baton`
   directory walking up (with `hubClaimsProject` shadow-store handling), else `git rev-parse
   --show-toplevel`, else `null`.
3. `startBatonDaemon(folderPath)`:
   - If the running daemon already serves the same root → **reuse** it.
   - Otherwise find the PID on the port (`meta.pid`, or fall back to `netstat`/`lsof`
     because the installed baton build does not always report `pid` in `/api/meta`), kill it
     (`taskkill /pid <pid> /t /f` on Windows), wait for the port to free, then spawn a fresh
     daemon with `cwd = resolved root`.
   - After startup, re-probe `/api/meta` and refuse to report success if the port answers as a
     different repo.
4. `stopBatonDaemon()` — kills the tracked child **and** any other process still listening on
   the Baton port, so Stop always stops the daemon the dashboard talks to.

**Verification**: a temporary end-to-end vitest test started a real `baton serve` in a
*different* folder, called the real `startBatonDaemon()` for the target folder, and asserted
`/api/meta` then reports the target folder. Passed. (Test removed after the run.)

### 4.4 UI

`BatonPane.tsx` shows: current folder, CLI/Node/git/uv availability, setup status, daemon
status, the folder the daemon actually serves, and — when running — "Skills installed: N / M".
All user-visible strings go through `translate()`; new keys go into `en.json` (other locales
fall back to English).

### 4.5 Skill auto-install

On every `startBatonDaemon` (both the reuse and fresh-spawn paths), `baton-skill-install.ts`
calls `GET /api/skills` then `POST /api/skills/:id/install` with `{"agent":"all"}` for each
catalogued skill (idempotent; write-gated daemon, loopback `Origin` header). Best-effort: a
failed/failed catalog call just leaves `skills` null. `BatonDaemonStatus.skills` carries
`{ total, installed, failed }` for the pane.

### 4.6 Dashboard restyle

The Baton dashboard (`web/` in the Baton checkout) is restyled to match the IDE: zinc palette
(dark bg `#0a0a0a`, accent `#404040`, border `rgb(255 255 255 / 0.07)`, …) and the Geist
typeface instead of Google Fonts. Built with `npm run build --prefix web`; the daemon serves
`web/dist`. Note: the live globally-linked install serves the **Desktop** copy of the Baton
repo, so restyled `web/dist` assets are synced there too (see `brain.md` → "two baton copies").

---

## 5. Rebrand scope (what changed vs upstream)

- `package.json` → name `logicmantra-ide`, author/homepage `logicmantra`. `bin.orca` kept
  (required by `verify-cli-bin.mjs`); `logicmantra` + `orca-dev` aliases added.
- `config/electron-builder.config.cjs` → `appId com.logicmantra.ide`, `productName "LogicMantra
  IDE"`, artifact/executable names, publish owner/repo `logicmantra/logicmantra`.
- Window/tab/menu/tray titles, `<title>` tags, i18n locales, landing brand title → LogicMantra.
- Logo replaced everywhere (`resources/logo.svg` embeds the new PNG; icons regenerated from
  `ide logo.png`).

**Deliberately NOT rebranded** (internal identifiers): `orca-runtime-*` filenames, `~/.orca`
dirs, `ORCA_*` env vars, `orca.yaml`, `orca-dev` CLI name, upstream `stablyai/orca` URLs,
`X-Orca-Agent-Hook-Token`, `Orca Computer Use.app`. Only user-visible strings were rebranded.

---

## 6. GitHub workflow

- **Remote**: `origin` → https://github.com/Gagan-k0/IDE.git (`main` branch).
- **Init**: `git init -b main` then `git remote add origin https://github.com/Gagan-k0/IDE.git`.
- **Commit**: stage intended files only; never commit secrets; concise messages.
- **Push**: `git push -u origin main`.

### 6.1 `.gitignore` decisions

The upstream `.gitignore` is kept and extended:

- `node_modules/`, `dist/`, `dist-electron/`, `out/`, `build/`, `release/` — build artifacts.
- `docs/**` with a **small allow-list** (STYLEGUIDE + a few reference docs + `docs/readme/`).
  The previously re-included `docs/assets/` (≈250 MB of upstream Orca showcase GIFs) is now
  **ignored** — unnecessary media for a rebranded IDE.
- Added for the Baton integration: `.baton/` (machine-local coordination state) and
  `graphify-out/` (graphify build output).
- `tsconfig.*.tsbuildinfo`, coverage, logs, IDE/OS files — ignored.

---

## 7. Agent conventions (summary of `AGENTS.md`)

- All UI work follows `docs/STYLEGUIDE.md` + tokens in `src/renderer/src/assets/main.css`.
- Comments: concise, WHY not HOW, 1 line where possible. No `max-lines` disables, ever.
- File/module names must be concrete domain names — never `helpers`/`utils`/`common`.
- Prefer `.ts` over `.d.ts`. Cross-platform (macOS/Linux/Windows), SSH + folder-workspace safe.
- `en.json` is the source of truth for new `translate()` keys; locales stay no-BOM + CRLF.
- Every session: read `brain.md` first, update it after each milestone.

---

## 8. Status & roadmap

**Done**

- Full LogicMantra rebrand (naming + logo + Windows build verified).
- Baton integration (setup → daemon → dashboard) with correct-folder guarantee.
- Baton skill auto-install on Start Baton + dashboard restyled to the IDE design.

**Verified**

- `pnpm run typecheck`, `oxlint`, `verify:localization-*`, `build:win` — all green.

**Remaining / optional**

- macOS `icon-source` (Xcode project still references old logo) — mac/linux builds.
- Rebrand remaining `docs/` upstream content if it should ever be tracked.
- Optional: restore the "dashboard terminal sessions" path by installing tmux.