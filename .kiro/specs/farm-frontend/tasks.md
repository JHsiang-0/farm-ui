# Farm Frontend Kiro Tasks

Status: `[x]` completed; `[ ]` pending or waiting for the backend contract.

## Kiro three-stage progress

- Requirements: frozen roles, states, API boundaries, and error rules from `API_HANDOFF.md` and `FRONTEND_TODO.md`.
- Design: established the View -> Store -> API -> request/mock layers, realtime printer state, and the safe printing flow.
- Tasks: implemented P0 and P1 incrementally, verified each stage, updated the checklists, and created local commits in Chinese.

## P0: API contract and foundation

- [x] P0.1 Environment variables, request wrapper, Bearer token, unified responses, and error handling.
- [x] P0.2 Pagination, Long IDs, time, file-size, and progress adapters.
- [x] P0.3 Unified API modules, presigned downloads, and planned-API isolation.

## P1.1: Login and permissions

- [x] Login, logout, remember-me, disabled-account, and service-error feedback.
- [x] `requiresAuth` and `roles` route guards.
- [x] ADMIN/OPERATOR menu and operation permissions.
- [x] ADMIN user pagination, creation, enable, and disable.
- [x] ADMIN printer configuration permissions and OPERATOR business permissions.
- [x] Backend password rule: 6-20 characters with uppercase, lowercase, and digits.

## P1.2: Printer dashboard and management

- [x] Printer pagination, static dashboard information, and realtime state display.
- [x] ADMIN add, edit, delete, LAN scan, batch add, and grid-position maintenance.
- [x] Per-device success/failure reasons for scan and batch add.
- [x] State-limited pause, cancel, emergency stop, and safe-start controls with confirmation/loading.
- [ ] Printer detail, status history, and statistics; waiting for planned backend APIs.

## P1.3: File library

- [x] File pagination, name search, `materialType` filtering, and current-directory query.
- [x] G-code/BGCODE upload, progress, 100MB limit, extension validation, and storage errors.
- [x] Current-directory `parentId` upload, folder creation, navigation, and breadcrumb return.
- [x] Single/batch delete confirmation and handling of permission, missing-resource, and related-task errors.
- [x] File detail with slice parameters, material, nozzle, temperature, estimated time, print count, and success rate.
- [x] Presigned-URL download with expired URL, missing file, and CORS failure handling.
- [ ] File jobs, directory tree, and safe preview; waiting for planned backend APIs.

## P1.4: Job queue and safe printing

- [x] Queue/history APIs, priority and creation-time ordering, and status/printer/time filters.
- [x] Job creation with an optional printer; no printer keeps the job in `QUEUED`.
- [x] Only the eight frozen states: `QUEUED`, `ASSIGNED`, `READY`, `PRINTING`, `PAUSED`, `COMPLETED`, `FAILED`, `CANCELLED`.
- [x] Safe dispatch: `QUEUED -> ASSIGNED`.
- [x] On-site confirmation and start: `ASSIGNED -> READY/PRINTING`.
- [x] State-limited cancel, pause, emergency stop, and task-detail drawer.
- [ ] Retry, requeue, and priority adjustment; waiting for planned backend APIs.

## P1.5: WebSocket realtime state and Mock

- [x] `/ws/farm-status` with the current token and exponential-backoff reconnect.
- [x] `SNAPSHOT`, `PRINTER_STATUS`, `PRINTER_OFFLINE`, and `JOB_STATUS` messages.
- [x] Destroy connections and timers on unmount, logout, and dashboard switching.
- [x] Show "data may not be up to date" on disconnect and prevent duplicate connections.
- [x] Mock snapshot, device-status, offline, and job-status event stream.
- [x] Mock response wrapper, error-code scenarios, state reset, and development-account documentation.

## P2: Experience, tests, and production hardening

### P2.1 Interaction experience

- [ ] Complete loading, empty, permission, network-error, maintenance, and offline pages.
- [ ] Add upload cancellation, retry, and duplicate-name feedback.
- [ ] Provide explicit feedback for job state changes.
- [ ] Preserve printer, file, and job detail context after refresh.
- [ ] Support LAN wall displays and narrow screens.

### P2.2 Verification and acceptance

- [ ] Add request-layer, pagination, route-permission, job-button, and WebSocket tests.
- [ ] Complete E2E acceptance: login -> upload -> create job -> dispatch -> safety confirmation -> start -> pause/resume -> complete/fail.
- [x] `npm run lint` passed for the current stage.
- [x] `npm run build` passed for the current stage.
- [x] `git diff --check` passed for the current stage.

### P2.3 Production environment

- [ ] Use independent production environment variables; never commit `.env`, tokens, passwords, or real device credentials.
- [ ] Complete CORS, presigned URL, and WebSocket-authentication integration.
- [ ] Unify API, WebSocket, object-storage, and device-network error handling.
- [ ] Confirm production never enables anonymous WebSocket or Mock data.

## Current blockers and boundaries

- Printer detail/history/statistics, file tree/jobs/preview, and job retry/requeue/priority APIs are planned in `API_HANDOFF.md`; the frontend does not call them yet.
- User profile and change-password pages remain in the baseline TODO and are outside the completed P1 direct-integration scope.
