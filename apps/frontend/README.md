# Cost Buildup Frontend

React, TypeScript, and Vite client for the Cost Buildup for Imported Items system. The frontend communicates with the NestJS API; configure its base URL with `VITE_API_URL`.

## Setup

From the repository root, create the local frontend environment file and install the locked dependencies:

```powershell
Copy-Item apps\frontend\.env.example apps\frontend\.env
cd apps\frontend
pnpm install --frozen-lockfile
pnpm run dev
```

The development server runs at `http://localhost:5173`. Start the backend and its dependencies as described in the root [README](../../README.md).

## Commands

```powershell
pnpm run dev       # Start the Vite development server
pnpm run build     # Type-check and build for production
pnpm run typecheck # Type-check without producing a build
pnpm test          # Run Vitest tests
pnpm run e2e       # Run Playwright end-to-end tests
pnpm run lint      # Lint frontend source
```

## Source Layout

- `src/app`: application router and route configuration.
- `src/components`: shared layout, authorization, and UI components.
- `src/features`: domain screens and API calls grouped by business area.
- `src/lib`: API client, environment configuration, and formatting utilities.
- `src/store`: authentication/session and theme state.
- `src/i18n`: translations and internationalization setup.
- `src/test`: shared test setup, utilities, and API mocks.
- `e2e`: Playwright end-to-end scenarios.
