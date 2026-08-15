---
id: "graph:project/brain"
type: "project"
title: "LogicMantra IDE — Brain (living memory)"
description: "The living state of the orca -> LogicMantra IDE conversion. Read before ANY edit; update after every milestone so work never restarts from scratch."
status: "curated"
tags:
  - "project"
  - "memory"
---

# LogicMantra IDE — Brain

> **NEW SESSION (MANDATORY): start by reading THIS file from top to bottom, then the sections below it.** Command: `Get-Content -LiteralPath "C:\Users\lenovo\Desktop\LogicMantra\LogicMantra IDE\brain.md"` (or in opencode: `read brain.md` with that absolute path). This file carries the full project state; without it the next agent starts blind.

## Mission

1. Convert the Orca IDE codebase (originally `stablyai/orca`, v1.4.178-rc.2) into a rebranded **LogicMantra IDE** ("Next-gen IDE for parallel agentic development") and replace its logo with `C:\Users\lenovo\Desktop\LogicMantra\ide logo.png`. — COMPLETE (naming + logo + Windows build verified).
2. **Integrate the Baton multi-agent coordination CLI** (`baton-cli` 0.0.1) into the IDE: a "Start Baton" settings pane that runs full `baton setup` for the folder where the IDE is open, starts the baton daemon, and opens the dashboard (http://127.0.0.1:7077) in the built-in browser tab. — **DONE (implemented + built 2026-08-14)**. Use it via Settings → Baton. **BUG FIXED 2026-08-15** (wrong knowledge graph — see "Baton wrong-graph bug" below).
3. **Track the project on GitHub.** — **DONE 2026-08-15**: `LogicMantra IDE` is now a git repo with remote `origin` → https://github.com/Gagan-k0/IDE.git (branch `main`), first push `c1ef7a1` ("LogicMantra IDE: rebrand, Baton daemon fix, project docs"). README.md rebranded + detailed; PROJECT.md added. See "GitHub milestone (2026-08-15)" below.
4. **Baton: auto-install all skills on Start Baton + restyle the Baton dashboard to match the IDE design.** — **DONE 2026-08-15** (see "Baton skills + dashboard restyle (2026-08-15)" below).
5. **Integrate the OmniRoute AI gateway** into the IDE as a Settings pane (mirrors the Baton integration): probe omniroute/node/Claude availability, start/stop/monitor the gateway server on port 20128, run `omniroute setup-claude` to generate Claude Code profiles per model, and open the dashboard in the built-in browser tab. DONE 2026-08-15 on branch `feature/omniroute` (commit `fd5eabd`, pushed to `origin/feature/omniroute`, NOT merged to main). See "OmniRoute integration notes" below.

## Layout (do not confuse)

- `C:\Users\lenovo\Desktop\LogicMantra\orca` — pristine git checkout (upstream `origin/main`, cb42b60849). Read-only reference for diffs.
- `C:\Users\lenovo\Desktop\LogicMantra\LogicMantra IDE` — THE WORKING COPY. All edits happen here. **Now a git repo**: remote `origin` → https://github.com/Gagan-k0/IDE.git, branch `main`, committed + pushed (first commit `c1ef7a1`, 2026-08-15). Push new work with `git push`.
- `C:\Users\lenovo\Desktop\LogicMantra\ide logo.png` — the logo to use for the IDE (561x513, full-color dark tile, near-black bg ~#05060B with bright blue/orange accents — NOT a transparent glyph like the old white whale).
- `C:\Users\lenovo\Desktop\LogicMantra\Baton-Multi-Agent-` — the BATON project source being integrated (npm package `baton-cli` 0.0.1, AGPL-3.0, Node >= 24, git + uv + tmux-optional). Docs: `docs/README.md`, `docs/installation.md`, `docs/quickstart.md`, `docs/cli-reference.md` in that folder + https://baton-landing.vercel.app/ + https://github.com/Rakshan001/Baton-Multi-Agent-. This folder ALSO has an already-set-up `kb/` (knowledge graph: `projects` + `kb-manifest.json`) and a daemon already running on 127.0.0.1:7077 — the IDE feature must tolerate "already set up / already running".
- **⚠️ TWO baton copies exist (verified 2026-08-15 — do not confuse):**
  - `C:\Users\lenovo\Desktop\Baton-Multi-Agent-` — git checkout of upstream `Rakshan001/Baton-Multi-Agent-` at `e5c4feb` ("chore(deps): upgrade to TypeScript 7 ... #25"), built (has `dist/`). **This is the LIVE install**: the global npm link junction `C:\Users\lenovo\AppData\Roaming\npm\node_modules\baton-cli` → this folder, so the daemon the IDE starts (`baton serve`) resolves `WEB_DIST = ../web/dist` relative to ITS `dist/cli.js` and serves **this** copy's `web\dist`.
  - `C:\Users\lenovo\Desktop\LogicMantra\Baton-Multi-Agent-` — SEPARATE git checkout at `22f7aa9` ("bump execa ... #41"), NO `dist/` (never built the CLI). This is the copy the IDE integration edits/docs reference, and where the dashboard restyle was done.
  - **Rule: to make a dashboard change VISIBLE to the running daemon, sync the built output to the LIVE copy** — copy `LogicMantra\Baton-Multi-Agent-\web\dist\*` → `Desktop\Baton-Multi-Agent-\web\dist\` (with `-Force`; a plain `Copy-Item web\dist\* ...` silently did NOT overwrite `index.html` the first time — re-copy `index.html` explicitly). Verify by fetching the CSS asset and checking for `Geist` + `#0a0a0a`.
- Baton is installed GLOBALLY (npm link): `C:\Users\lenovo\AppData\Roaming\npm\baton.cmd`, `baton --version` = 0.0.1. Environment: node v24.16.0, git 2.51.0.windows.1, uv 0.11.28. tmux NOT installed (optional — dashboard terminal sessions unavailable).

## Conversion state (updated continuously — ALWAYS update after each milestone)

### DONE

1. `package.json` — name `logicmantra-ide`, homepage/author logicmantra, bin: `orca` + `logicmantra` aliases + `orca-dev` script entry. NOTE: `bin.orca` is REQUIRED by config/scripts/verify-cli-bin.mjs ("package.json must declare bin.orca") — the earlier session's rename to only `logicmantra` broke `build:cli`; fixed by keeping both aliases. CLI name stays `orca` (internal, per naming decision).
2. `config/electron-builder.config.cjs` — `appId: com.logicmantra.ide`, `productName: 'LogicMantra IDE'` (line 94). `win.executableName: 'LogicMantra'` (line ~294, exe file stays `LogicMantra.exe` — no space in filename; the SPACE lives in productName which drives PE resources/NSIS/shortcut). Linux `executableName: logicmantra-ide`, `StartupWMClass: logicmantra-ide`.
3. `src/main/menu/register-app-menu.ts` — menu labels "Explore LogicMantra", "Getting Started with LogicMantra".
4. `src/main/window/createMainWindow.ts` — window title `'LogicMantra IDE'` (line 274), tray notification title `'LogicMantra IDE'` (line 1012). Default body fallback still "LogicMantra is still running..." (grammar-safe).
5. `src/main/window/dashboard-popout-window.ts` — title `'LogicMantra IDE Agent Dashboard'` (line 165). Test `dashboard-popout-window.test.ts` updated to match.
6. `src/renderer/index.html` → `<title>LogicMantra IDE</title>`, `popout.html` → `<title>LogicMantra IDE Agent Dashboard</title>`. `web-index.html` stays `<title>LogicMantra Web</title>` (separate web client).
7. i18n locale files fully rebranded (en/es/ja/ko/zh) — value-only replacement, keys untouched. Added: landing brand title key `auto.components.Landing.6ca6ff404e` was `"ORCA"` (uppercase, missed by the value sweep) → `"LogicMantra"` in en/es/ja/zh (ko was already LogicMantra). Fallback in `Landing.tsx` line 271 updated to `'LogicMantra'` too.
8. Installed `graph-memory-bank` skill at `~\.agents\skills\graph-memory-bank` (Obsidian-style graph memory; use it every session).
9. electron-builder + dev-app-update config fully rebranded — see detailed scope below.
10. **Full Windows build PASSED** — `pnpm run build:win` produces `dist\logicmantra-windows-setup.exe`, `dist\win-unpacked\LogicMantra.exe`, `latest.yml`, `.blockmap`, `builder-debug.yml`.
11. **Product display name = "LogicMantra IDE"** — verified via `(Get-Item ...\LogicMantra.exe).VersionInfo`: FileDescription="LogicMantra IDE", ProductName="LogicMantra IDE", CompanyName="logicmantra". This is what the user reported missing ("inside the exe name is not updated to LogicMantra IDE") and it is now correct.

### Logo replacement (NEW — this milestone)

- `resources/logo.svg` — was the old white-orca path SVG used as `<img>` in 5 UI components. Replaced with an SVG embedding the new logo PNG as a base64 data-URI `<image>` (561x513). Served to: `App.tsx` titlebar, `Landing.tsx`, `onboarding/OnboardingFlow.tsx`, `sidebar/SidebarSettingsHelpMenu.tsx`, `settings/orca-logo-settings-icon.tsx`.
- REMOVED the `invert dark:invert-0` CSS filters that were tuned for the old WHITE transparent glyph — they distorted the new full-color tile. Specifically:
  - `main.css` `.titlebar-logo` — removed the `filter: invert(1)` block; added `width: auto`.
  - `OnboardingFlow.tsx` line 210 — dropped `invert dark:invert-0`.
  - `SidebarSettingsHelpMenu.tsx` line 245 — dropped `invert dark:invert-0` (kept opacity-55).
  - `orca-logo-settings-icon.tsx` — dropped `invert dark:invert-0`.
- `src/renderer/src/components/mobile/slides/HomeSlide.tsx` — replaced the inline old-whale `<svg>` `OrcaLogo` with `<img src={logo}>` (import path is 6 ups: `../../../../../../resources/logo.svg` because slides/ is one level deeper than components/). `mobile-page.css` `.mp-orca-logo` → 28x28, `object-fit: contain`, `border-radius: 5px`.
- `src/renderer/src/components/stats/share-card-utils.tsx` — replaced inline white-whale `OrcaLogo` (used on exported usage share cards) with `<img src={logo}>` (5 ups: `../../../../../resources/logo.svg`; stats/ is at components/ depth). Width/height 26, objectFit cover, radius 4.
- `resources/build/icon.icns` — was a CORRUPT 62-byte file (declared a 1.1 MB ic07 but truncated). Regenerated with Pillow from `ide logo.png` → 1,174,850 bytes with 16/32/64/128/256/512/1024 frames.
- Mac `resources/icon-source/icon.icon` (actool/Xcode Icon Composer project) still references the old `Assets/logo.svg` — only used for macOS builds via Xcode, NOT part of the Windows build. Left as-is for now (optionally update later).
- PNG icon assets were ALREADY the new logo from the prior session and unchanged: `resources/icon.png` (256), `icon-dev.png` (256), `resources/build/icon.png` (1024), `app-icons/orca-blue.png` + `orca-watercolor.png` (1024). Tray template icon `resources/tray/orca-menu-barTemplate*.png` left as monochrome template (intentional).

### DONE — Baton integration (implemented 2026-08-14)

Implemented exactly per the plan below; the "Start Baton" button now lives in Settings → Baton (grouped under capabilities, next to Orchestration). Files:
- `src/shared/baton-types.ts` — `BatonAvailability`, `BatonSetupResult`, `BatonDaemonStatus`, `BATON_DAEMON_PORT=7077`, `BATON_DAEMON_URL=http://127.0.0.1:7077`.
- `src/main/ipc/baton.ts` — `registerBatonHandlers()` (no store needed). Channels: `baton:getAvailability` (probes baton/node/git/uv/graphifyy versions via `resolveCliCommand`), `baton:setup` (spawns `baton setup --yes --local --serve <folder>`, captures output, 5-min timeout), `baton:getDaemonStatus` / `baton:startDaemon` / `baton:stopDaemon` (spawns `baton serve --write -p 7077` DETACHED, tracks the child, HTTP-probes 127.0.0.1:7077 to detect "already running", polls up to 20s for readiness, kills tree on stop via taskkill), `baton:isSetupComplete` (checks `<folder>/.baton` exists). Uses `getSpawnArgsForWindows` on win32 + `resolveCliCommand('baton')`.
- `src/preload/api/baton-api.ts` (`baton: BatonApi`) + wired in `src/preload/api-types.ts` and `src/preload/index.ts` (block added before `emulator:`; types imported from `../shared/baton-types`).
- `src/renderer/src/components/settings/BatonPane.tsx` + `baton-search.ts` — pane shows current folder (`useActiveWorktree()` path), versions, setup/daemon status; buttons Start Baton (setup→startDaemon→createBrowserTab to dashboard), Open Dashboard, Stop. SearchableSetting pattern, all strings via translate().
- Registered: `'baton'` added to `SETTINGS_NAV_TARGETS` (settings-navigation-types.ts), nav section (GitBranch icon, group 'capabilities', in useSettingsNavigationMetadata.ts), and `<SettingsSection id="baton">` in Settings.tsx.
- en.json got 38 new keys (auto.components.settings.baton.*, BatonPane.*, Settings.baton*, useSettingsNavigationMetadata.baton*).
- Verified: typecheck EXIT=0, oxlint clean, verify:localization-extraction EXIT=0, verify:localization-catalog clean.

### TODO (remaining work)

- [x] Replace app icon: `src/main/app-icon.ts`, `resources/icon-source/`, `resources/icon.png` (check what surfaces exist). — DONE via icon.png/icon-dev.png/build/*/app-icons/* + logo.svg + mobile + share-card
- [x] Rebrand remaining user-facing "Orca"/"orca" strings in src/main + src/renderer (NOT test files, NOT internal `~/.orca` paths, NOT `ORCA_` env vars, NOT internal identifiers like `orca-runtime-*` unless user-visible). — DONE (tests included to stay in sync)
- [x] Verify i18n locales for leftover "Orca" strings. — DONE: en/es/ja/ko/zh swept with value-only JSON walk (skip keys, ORCA_* env, orca.yaml, identifier compounds); all clean except 2 intentional zh.json refs to config filename `Orca.yaml` (= stays orca.yaml). Uppercase brand title `"ORCA"` key `6ca6ff404e` fixed this milestone. no-BOM + CRLF preserved.
- [x] Locale key integrity fix — DONE: earlier session had renamed 4 nested i18n KEYS `orca`→`logicmantra` in locale files while source still references `.orca.` keys (21 dotted paths). Restored keys to `orca` in all 5 locales (keys are internal identifiers, per naming decision). Key sets now byte-identical to pristine for all 5 locales.
- [x] Locale file format fix — DONE: earlier session had written locale files with UTF-8 BOM + LF; pristine is no-BOM + CRLF. Rewrote all 5 as no-BOM CRLF (BOM broke verify-localization-catalog's JSON.parse).
- [x] electron-builder: executableName/artifactName/packageName/NSIS/desktop entries still say orca — decide scope. — DONE (user chose A+B = everything user-visible):
  - artifactName: logicmantra-windows-setup.${ext}, logicmantra-macos-${arch}.${ext}, logicmantra-linux[-arm64].${ext}
  - packageName: logicmantra-ide (deb+rpm), artifactName: logicmantra-ide_* / logicmantra-ide-*
  - executableName: logicmantra-ide, StartupWMClass: logicmantra-ide (comments updated)
  - dev channels: logicmantra-hourly/daily/adhoc; publish owner/repo: logicmantra/logicmantra (was stablyai/orca); maintainer: logicmantra
  - config/dev-app-update.yml: owner logicmantra, repo logicmantra, updaterCacheDirName logicmantra-updater
  - KEPT (bucket C, internal): resources/bin/orca.cmd, orca.exe, darwin bin/orca, linux bin/orca-ide, orca-notification-status, orca-plugin.json, orca-marketplace.json, orca-cli skill topic, chmod launcher loop ['orca','orca-ide'], comments referencing those filenames
  - KEPT (upstream URLs, per naming decision): github.com/stablyai/orca everywhere (test fixtures, CLI spec examples, ORCA_SKILLS_REPOSITORY_URL, @stablyai/playwright-test npm scope, ORCA_MAC_RELEASE=1 env in build scripts)
  - Config verified: `node --check` cjs OK, yaml safe_load OK
- [x] Final check: `pnpm lint`/typecheck. — DONE (see Build & Verification below). Rebuilt `build:win` after the "LogicMantra IDE" naming + logo changes and verified the exe ProductName.
- [ ] (optional) mac icon-source `Assets/logo.svg` update; mac + linux builds.

## Baton integration notes (IMPORTANT — prevents hallucination)

- User intent: "our ide should have the start baton option; at that time all the full setup of baton is done for that particular folder where the ide is open"; "use the memorygraph again and again which is in the baton folder"; "read the documentation of baton and implement one by one"; "update memory file again and again ... don't hallucinate".
- Baton is a Node ESM CLI (`"type": "module"`, `bin: { baton: "dist/cli.js" }`, engines `node >= 24` — uses built-in `node:sqlite` FTS5). Deps: @modelcontextprotocol/sdk, commander, execa, gray-matter.
- Non-interactive setup: `baton setup --yes --local --serve <folder>`. `--yes` auto-accepts defaults; `--local` skips the share prompt (kbInitCmd: `share = opts.share === true ? true : opts.local === true ? false : askShare()`); `--serve` skips the dashboard-vs-headless prompt. Single-git-repo folders have no further prompts (multi-repo folders need `--hub`/`--individual`; an IDE worktree folder is single-repo so OK).
- Commands: `setup`, `kb init`, `serve` (dashboard http://127.0.0.1:7077, binds 127.0.0.1 only, `--write` enables mutations), `new/pass/take/done/merge/rm`, `status`, `memory`, `skills`, `bugs`, `doctor`, `clean`, `connect`, `mcp`.
- Known-good pattern for spawning the global CLI from main: `resolveCliCommand('baton')` (PATH + nvm/volta/asdf/fnm/mise/npm/pnpm/yarn/bun dirs; win32 tries `baton.cmd`/`baton.exe`/`baton.bat`) then `getSpawnArgsForWindows(resolvedCmd, args)` which wraps `.cmd`/`.bat` in `cmd /d /c` and THROWS `UnsafeWindowsBatchArgumentsError` on `& | < > ^ " % !` and CR/LF in args (worktree paths with those chars → catch and surface a friendly error).
- Settings registry details (found in exploration, do not reinvent): `SETTINGS_NAV_TARGETS` array in `src/renderer/src/lib/settings-navigation-types.ts` (line 15, ~49 entries, `as const`); sections built in `buildSettingsNavigationMetadata({...})` in `src/renderer/src/hooks/useSettingsNavigationMetadata.ts` with `group: 'capabilities'` (orchestration is in capabilities; verify group name by reading the file); `Settings.tsx` renders `<SettingsSection id="..." title description searchEntries>{isSectionMounted(id) ? <Pane/> : null}</SettingsSection>`; lazy-mounting via `deriveNeededSectionIds`/`getInitialMountedSectionIds` in `components/settings/settings-load-performance.ts` (new ids flow through automatically).
- Active folder: `useActiveWorktree()` selector (`src/renderer/src/store/selectors.ts:235`) → `.path` is the local folder where the IDE is open. For non-git folder workspaces the same selector resolves via folderWorkspaces. Baton setup should run with cwd = that path.
- `createBrowserTab(worktreeId, url, options)` in `src/renderer/src/store/slices/browser.ts:152` (renderer-only, uses worktreeId — pass the active worktree id, NOT a bare URL).
- Store type in main = `import type { Store } from '../persistence'`; handler registration file is `src/main/ipc/register-core-handlers.ts` (guarded single registration; takes `store` and services).
- UI conventions: panes use `SearchableSetting` + `matchesSettingsSearch(searchQuery, getXPaneSearchEntries())`; search entries via `createLocalizedCatalog(() => [...])` with `translate` + `translateSearchKeyword` (see `components/settings/orchestration-search.ts`). All user-visible strings go through `translate()` with auto keys.
- Windows: use `getSpawnArgsForWindows`; exe is `LogicMantra.exe`; productName `LogicMantra IDE`; locales no-BOM CRLF; internal identifiers stay `orca` (see Naming decision).
- Docs to re-read if unsure: `C:\Users\lenovo\Desktop\LogicMantra\Baton-Multi-Agent-\docs\*.md`, `src/commands/setup.ts`, `src/commands/serve.ts` in the baton repo.
## OmniRoute integration notes (IMPORTANT - prevents hallucination)

- User intent: add an OmniRoute gateway settings pane to the IDE (mirror of the Baton pane). OmniRoute = open-source AI gateway/router (https://github.com/diegosouzapw/OmniRoute.git, https://omniroute.online). Default port 20128 (API + dashboard on the SAME port, both http://127.0.0.1:20128). Health probe: GET http://127.0.0.1:20128/api/monitoring/health returns { status, version, system: { pid, ... }, ... } - use for reachability + version + pid.
- OmniRoute is installed GLOBALLY: C:\Users\lenovo\AppData\Roaming\npm\omniroute.cmd, `omniroute --version` = 3.8.49 (repo package.json says 3.8.50; the installed one is authoritative). Node v24.16.0 satisfies engines (>=22.22.2 <23 || >=24 <27). A server was ALREADY running on 20128 (pid 11136, healthy) when this feature was built - startOmniRouteServer() must tolerate already-running (it reuses via probeOmniRouteHealth()).
- CLI: default command is `serve` (starts the Next.js server). `omniroute serve --no-open --port 20128` = non-interactive, no browser pop. `omniroute setup-claude` fetches the LIVE /v1/models catalog from the running server and writes ~/.claude/profiles/<name>/settings.json for each model (idempotent, reuses setup-codex profile names). Requires the server to be running first (pane disables the Setup Claude Code button until server.running). `omniroute launch --profile <name>` injects ANTHROPIC_AUTH_TOKEN at runtime (token never written to disk).
- Manual Claude Code config (from the user's 5-min guide): ANTHROPIC_BASE_URL=http://localhost:20128, ANTHROPIC_AUTH_TOKEN=YOUR_API_KEY, ANTHROPIC_MODEL=auto. Do NOT append /v1 to the base URL.
- Feature flag for auto-sync of Claude profiles: OMNIROUTE_AUTO_SYNC_CLAUDE_PROFILES (default OFF) in src/lib/cli-helper/claudeProfileAutoSync.ts.
- Pattern used (identical shape to Baton): src/shared/omniroute-types.ts (OmniRouteAvailability/OmniRouteSetupResult/OmniRouteServerStatus + OMNIROUTE_PORT=20128/OMNIROUTE_URL/OMNIROUTE_HEALTH_URL); src/main/ipc/omniroute-server-process.ts (reuses captureCommandOutput/killDaemonPid/pidListeningOnPort from baton-daemon-process.ts via re-export, adds isOmniRouteReachable/probeOmniRouteHealth/waitForOmniRouteReady(60s)/waitForOmniRouteGone(15s)); src/main/ipc/omniroute-server.ts (lifecycle: get/start/stop, reuse-if-running, taskkill tree on win32); src/main/ipc/omniroute.ts (registerOmniRouteHandlers: getAvailability/setupClaude/getServerStatus/startServer/stopServer); registered at register-core-handlers.ts right after registerBatonHandlers().
- Renderer: src/preload/api/omniroute-api.ts + `omniRoute: OmniRouteApi` in api-types.ts + preload block in preload/index.ts (after baton); src/renderer/src/components/settings/OmniRoutePane.tsx + omniroute-search.ts; 'omniroute' added to SETTINGS_NAV_TARGETS (settings-navigation-types.ts), nav section id 'omniroute' icon Cable group 'capabilities' in useSettingsNavigationMetadata.ts, <SettingsSection id="omniroute"> in Settings.tsx right after baton; en.json keys under auto.components.settings.omniroute.* / OmniRoutePane.* / Settings.omnirouteTitle+omnirouteDescription / auto.hooks.useSettingsNavigationMetadata.omnirouteTitle+omnirouteDescription.
- Pane behavior: no folder dependency (gateway is global, unlike Baton). Buttons Start OmniRoute (startServer + createBrowserTab to dashboard), Open Dashboard (needs server.running + activeWorktreeId), Setup Claude Code (runs setup-claude, shows output, requires server.running), Stop. Status shows CLI v/Node/Claude Code availability + server running url/version/pid.
- GLOBAL branch constraint: this feature lives ONLY on branch `feature/omniroute` (commit fd5eabd), pushed to origin/feature/omniroute - NOT merged to main (user merges manually). Keep it based on main e75b8d0.
- IMPORTANT: the generic process helpers live in baton-daemon-process.ts - DO NOT re-import omniroute into baton or duplicate them; re-export from omniroute-server-process.ts keeps the shared code in one place.

### MANDATORY: rebuild after ANY OmniRoute change

Same rule as Baton: ANY change under the OmniRoute integration paths (src/shared/omniroute-types.ts, src/main/ipc/omniroute*.ts, src/preload/api/omniroute-api.ts + preload wiring, src/renderer/src/components/settings/OmniRoutePane.tsx + omniroute-search.ts, Settings.tsx / useSettingsNavigationMetadata.ts / settings-navigation-types.ts / en.json OmniRoute keys) MUST be followed by `pnpm run build:win`.

## ⚠️ MANDATORY: rebuild after ANY Baton change

**ANY change to the Baton integration code MUST be followed by `pnpm run build:win`** (installer + `dist\win-unpacked\LogicMantra.exe`). The EXE is the only thing the user runs — source-only edits are invisible to them. Files that trigger this rule:

- `src/main/ipc/baton-daemon.ts` (daemon lifecycle — the graph fix lives here)
- `src/main/ipc/baton-daemon-process.ts` (extracted process plumbing: captureCommandOutput, isDaemonReachable, probeDaemonMeta, pidListeningOnPort, killDaemonPid, waitForDaemonGone/Ready, samePath)
- `src/main/ipc/baton-skill-install.ts` (skill auto-install + summary state)
- `src/main/ipc/baton.ts` (IPC handlers)
- `src/shared/baton-types.ts` (types + port/URL constants)
- `src/preload/api/baton-api.ts` + `src/preload/index.ts` / `api-types.ts`
- `src/renderer/src/components/settings/BatonPane.tsx` + `baton-search.ts`
- `src/renderer/src/i18n/locales/*.json` (Baton keys)

Rule of thumb: if a change is under any Baton/`baton` path, run the build before saying "done". Verify with `(Get-Item "dist\win-unpacked\LogicMantra.exe").VersionInfo` and check the timestamp is newer than the edit.

## Baton wrong-graph bug (fixed 2026-08-15 — this milestone)

**Symptom**: after Baton setup, the knowledge graph shown was for a DIFFERENT folder than the one open in the IDE (e.g. `Desktop\Baton-Multi-Agent-` instead of the IDE's target folder).

**Root cause**: the old `startDaemon` reused ANY daemon already listening on 127.0.0.1:7077 without checking which folder it serves. `baton serve` resolves its KB root from its OWN cwd (`resolveBatonRoot()`: nearest `.baton` walking up, else git root — see `Baton-Multi-Agent-\src\store.ts`), so a stale daemon kept serving its own folder's graph. ALSO learned live: the installed baton 0.0.1 `/api/meta` does NOT always report `pid` (META_PID was empty/null), and killing the `cmd` parent process leaves the node daemon alive — so PID must be found via the process LISTENING on the port.

**Fix**: extracted ALL daemon lifecycle logic into a new module `src/main/ipc/baton-daemon.ts` (kept `src/main/ipc/baton.ts` under the 300-line oxlint limit — max-lines disables are FORBIDDEN in this repo):
- `probeDaemonMeta()` — GET /api/meta to learn repo + pid of a running daemon.
- `resolveBatonRootFor(folderPath)` — mirrors baton's resolveBatonRoot (nearest `.baton` up; `hubClaimsProject` handles hub-shadow kb.json; else `git rev-parse --show-toplevel`; else null).
- `pidListeningOnPort(port)` — netstat -ano on win32 / lsof -t on mac+linux (fallback when meta.pid is null).
- `startBatonDaemon(folderPath)` — reuse daemon if it already serves the SAME root; else kill the port listener (taskkill /pid N /t /f on win32, SIGTERM elsewhere) → waitForDaemonGone → spawn `baton serve --write -p 7077` with `cwd = resolvedRoot` → waitForDaemonReady → re-probe /api/meta and refuse success if it answers a DIFFERENT repo.
- `stopBatonDaemon()` — kills the tracked child AND any other process still on the Baton port.
- `BatonDaemonStatus` gained `root: string | null` (`src/shared/baton-types.ts`); `BatonPane.tsx` shows a "Serving: {root}" line; en.json got key `servingLabel` (BatonPane). Typecheck + oxlint (default, type-aware, native-plugins) + all 3 localization verifies green.

**Proof**: temporary e2e vitest test (`src/main/ipc/baton-daemon.test.ts`) started a real `baton serve` in a foreign folder (`kamakshi-fresh`), called the real `startBatonDaemon()` for a target folder, and asserted /api/meta then reports the target folder. PASSED → then DELETED. Port 7077 verified clean afterwards.

## Baton skills + dashboard restyle (2026-08-15 — this milestone)

### Skill auto-install on Start Baton
- User intent: pressing Start Baton should install ALL baton skills (into every writable agent) automatically, so the dashboard catalog is ready without manual `baton skills install`.
- Baton API used: `GET http://127.0.0.1:7077/api/skills` → `{ skills: [{ id, ... }], agents }`; `POST /api/skills/:id/install` body `{"agent":"all"}`. Write-gated (daemon must run with `--write`) and requires a loopback `Origin` header — the renderer fetch adds `Origin: http://127.0.0.1:7077`. Installs are idempotent (`installSkillEverywhere` writes into each `SKILL_AGENTS` skill dir).
- New module `src/main/ipc/baton-skill-install.ts` (54 lines): `installAllBatonSkills()` (GET catalog → POST each id with `{"agent":"all"}` → best-effort summary), plus `getSkillsSummary()` / `clearSkillsSummary()` module state (kept out of the daemon file to respect the 300-line oxlint cap).
- Wired into `baton-daemon.ts`: called after daemon verified in BOTH `startBatonDaemon` paths (reuse + fresh spawn); `BatonDaemonStatus.skills` reflects it in `getBatonDaemonStatus` (only when running); `stopBatonDaemon` clears it. All `{ running: false, ... }` literals now include `skills: null`.
- `src/shared/baton-types.ts`: new `BatonSkillInstallSummary { total, installed, failed: string[] }` + `skills: BatonSkillInstallSummary | null` on `BatonDaemonStatus`.
- `BatonPane.tsx` shows a third status line "Skills installed: {installed} / {total}" (only when `skills !== null`); en.json key `skillsLabel`.
- Refactor: to stay under the 300-line oxlint cap, ALL process plumbing moved from `baton-daemon.ts` (now 186 lines) into `baton-daemon-process.ts` (`captureCommandOutput`, `isDaemonReachable`, `probeDaemonMeta`, `killDaemonPid`, `pidListeningOnPort`, `waitForDaemonGone`, `waitForDaemonReady`, `samePath`). `baton.ts` now imports `captureCommandOutput` from `baton-daemon-process`. `max-lines` disables remain FORBIDDEN.

### Dashboard restyle (baton web → LogicMantra IDE design)
- Edited `C:\Users\lenovo\Desktop\LogicMantra\Baton-Multi-Agent-\web\` (the LogicMantra copy, checkout `22f7aa9`):
  - `web\src\styles\tokens.css` — rewritten to the IDE zinc palette for dark + light: bg `#0a0a0a`, card `#171717`, secondary `#262626`, accent `#404040` (was blue), fg `#fafafa`, muted-fg `#a1a1a1`, ring `#737373`, border `rgb(255 255 255 / 0.07)`; semantic colors kept.
  - Font **Geist**: `Geist-Variable.woff2` copied from the IDE's `src\renderer\src\assets\fonts\` into `web\src\styles\fonts\`; `@font-face` added; `web\index.html` Google Fonts links (Inter/JetBrains Mono) REMOVED; `GraphCanvas.tsx` mono constant now `var(--font-mono, ...)`.
  - Build: `npm install --prefix web` (142 pkgs) + `npm run build --prefix web` (= `tsc -b && vite build`) → `web\dist\assets\index-RySKq48i.css` + `Geist-Variable-CrgPqtmy.woff2` bundled. Hardcoded data/semantic palettes (graph node colors etc.) left alone.
- **Live-serving sync**: since the running daemon serves the LIVE copy's `web\dist`, copied the new build there (`Desktop\Baton-Multi-Agent-\web\dist`). VERIFIED live: daemon on 7077 now serves `index-RySKq48i.css`, CSS contains `Geist` + `#0a0a0a`. (First `Copy-Item web\dist\*` did NOT overwrite the destination `index.html`; explicit re-copy of `index.html` + `assets\` with `-Force` worked.)

## GitHub milestone (2026-08-15)

- Repo created + pushed: `git init -b main` → remote `origin` = https://github.com/Gagan-k0/IDE.git → first commit `c1ef7a1` → `git push -u origin main`. Remote verified (`git ls-remote origin` → main = c1ef7a1). ~141 MB / 13,780 files committed.
- **Docs written**: README.md fully rebranded + detailed (features table, repo layout, build, Baton section, license). NEW `PROJECT.md` — detailed engineering doc (project map, stack, build/verify commands, Baton integration incl. the wrong-graph fix, rebrand scope, git workflow, conventions, status/roadmap). brain.md (this file) updated with every milestone.
- **`.gitignore` decisions**: kept the upstream file; REMOVED the `!docs/assets/` re-include (was committing ≈250 MB of upstream Orca showcase GIFs — unnecessary for the rebrand); ADDED `.baton/` (machine-local baton state) and `graphify-out/` (graphify build output). `config/patches/@xterm__xterm@6.1.0-beta.287.patch` (73 MB) is KEPT — required by pnpm patched deps for `pnpm install`.
- **Git config on this machine**: user.name `Gagan-k0`, user.email `gagan@foxwel.ai`; credential helper = Git Credential Manager (`manager`, system-level) — push reuses cached/token auth. `gh` CLI is NOT installed (use plain `git` for GitHub operations).
- **Tools used this milestone**: git (init/remote/push/ls-remote), pnpm (typecheck, oxlint, verify:localization-*), vitest (temp e2e), PowerShell (netstat/taskkill for daemon PID checks), Git Credential Manager (push auth).

## Build & Verification (current)

- `pnpm install` (1280 pkgs; postinstall native rebuild historically failed on windows-native-registry without VS C++ — now WORKS after installing `Microsoft.VisualStudio.2022.BuildTools` via winget with VCTools workload).
- `pnpm run typecheck` — clean (all three tsconfig passes).
- `pnpm run verify:localization-catalog` — clean. `verify:localization-extraction` — clean. `verify:localization-coverage` — clean.
- `pnpm exec oxlint` — clean.
- 2026-08-15 (baton-daemon.ts milestone) re-verified: `pnpm run typecheck` clean; `pnpm exec oxlint --config config/oxlint-code-quality-type-aware.json --deny-warnings` clean on changed files; `pnpm exec oxlint --config config/oxlint-code-quality-native-plugins.json --deny-warnings` clean; `verify:localization-catalog` (11,831 refs), `verify:localization-extraction`, `verify:localization-coverage` (12 allowlisted) all clean.
- `pnpm run build:win` — PASSED end-to-end (latest 2026-08-14 ~11:54 PM with the Baton feature). Output: `dist\logicmantra-windows-setup.exe` (~188 MB), `dist\win-unpacked\LogicMantra.exe`, `latest.yml`, `.blockmap`, `builder-debug.yml`.
- **REBUILD WITH BATON GRAPH FIX — 2026-08-15 12:44 PM PASSED** (EXIT=0). `dist\win-unpacked\LogicMantra.exe` (215 MB, FileVersion 1.4.178-rc.2, ProductName "LogicMantra IDE", CompanyName "logicmantra") + `dist\logicmantra-windows-setup.exe` (179.3 MB). This EXE now includes the wrong-graph fix from `baton-daemon.ts` (edited 11:00 AM, built 12:44 PM). **This is the NEW current build — the 14-08 build is OLD and should not be distributed.**
- **REBUILD WITH SKILLS + RESTYLE — 2026-08-15 13:42 PM PASSED** (EXIT=0). `dist\win-unpacked\LogicMantra.exe` (13:42:41, FileVersion 1.4.178-rc.2, ProductName "LogicMantra IDE") + `dist\logicmantra-windows-setup.exe` (179.4 MB, 13:44). **This is the CURRENT build** (skill auto-install + dashboard restyle + daemon refactor; pushed as `fa9a753`). Mandatory-rebuild rule satisfied.
- Verified: exe `VersionInfo` shows FileDescription/ProductName = **"LogicMantra IDE"**, CompanyName = **"logicmantra"**.
- Build blockers fixed along the way: (1) missing VS Build Tools → winget `Microsoft.VisualStudio.2022.BuildTools` (VCTools workload) to compile windows-native-registry; (2) `win.executableName: 'Orca'` → `'LogicMantra'`; (3) hand-built `icon.ico` had corrupt size headers → resedit crashed (`Invalid typed array length`) → regenerated with Pillow (4 valid entries 16/32/48/256, 74,832 bytes); (4) corrupt 62-byte `icon.icns` → regenerated with Pillow (1,174,850 bytes, 7 frames); (5) `UNRESOLVED_IMPORT` for `resources/logo.svg` in `share-card-utils.tsx` — path must be 5 ups (stats/ is at components/ depth), mobile HomeSlide needs 6 ups. (6) Baton integration — all verify checks + build green on first pass.

## Naming decision (IMPORTANT — prevents hallucination)

- User-visible brand: `LogicMantra` (capital M), and on the packaged app/product surfaces the FULL display name is `LogicMantra IDE` (productName + window/tab titles + <title>).
- Internal identifiers (file names `orca-runtime-*`, `~/.orca` dirs, `ORCA_*` env, `.graphifyignore`, `orca.yaml`, CLI `orca-dev` script, upstream URLs, `X-Orca-Agent-Hook-Token`, `Orca Computer Use.app`) are NOT rebranded — only what a user sees on screen or in packaged artifacts.

## Logo facts

- Logo file: `C:\Users\lenovo\Desktop\LogicMantra\ide logo.png` (561x513 PNG, full-color dark tile, mostly opaque — not transparent).
- All app icon surfaces regenerated from it: `resources/icon.png` (256), `icon-dev.png` (256), `build/icon.png` (1024), `build/icon.ico` (multi-size), `build/icon.icns` (16..1024), `app-icons/orca-blue.png` + `orca-watercolor.png` (1024).
- UI brand mark surfaces now serve the new logo: `resources/logo.svg` (embedded PNG, used by 5 components), mobile `HomeSlide` brand, stats export `share-card-utils` `OrcaLogo`.
- Old white-orca `<path>`/`<svg>` glyphs removed from: HomeSlide, share-card-utils. Any remaining inline copies (search `318.60232` / `177.81311`) should be replaced the same way.
- Tray template icon `resources/tray/orca-menu-barTemplate*.png` kept as monochrome template (macOS auto-tints; a color tile would break it).

## Verification commands (run after edits)

- `pnpm exec vitest run --config config/vitest.config.ts <file>` for unit tests.
- `pnpm run typecheck` for TS.
- `pnpm run build:win` for a full Windows installer build; then verify exe name:
  `(Get-Item "dist\win-unpacked\LogicMantra.exe").VersionInfo`
- Graph memory lint: `python3 C:\Users\lenovo\.agents\skills\graph-memory-bank\scripts\graph_memory_lint.py --root docs/graph` (not yet created).
