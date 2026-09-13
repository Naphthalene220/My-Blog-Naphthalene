# Repository Guidelines

## Project Structure & Module Organization

This is a Node.js 18+ Express blog using EJS and native ES modules. `server.js` starts the application and watches Markdown content. Backend code lives in `src/`: routes in `src/routes/`, persistence and search in `src/store/`, and Markdown/RSS rendering in `src/render/`. Templates are split among `views/pages/`, `views/admin/`, and `views/partials/`. Browser JavaScript and CSS belong in `public/`. Site settings live in `config/site.json`; posts and notes in `content/posts/`; images in `content/images/`. Tests are under `test/`.

## Build, Test, and Development Commands

- `npm install`: install dependencies for local development.
- `cp .env.example .env`: create local configuration; set secrets before testing admin flows.
- `npm run dev`: run the server with Node's watch mode at `http://localhost:3000` by default.
- `npm start`: run the server without watch mode.
- `npm test`: execute all tests serially with Node's built-in test runner.
- `npm ci --omit=dev`: perform a reproducible production install. There is no compile step.

## Coding Style & Naming Conventions

Match the existing JavaScript style: two-space indentation, single quotes, no semicolons, trailing commas in multiline literals, and `camelCase` identifiers. Use `PascalCase` for classes or constructors. Organize route files by surface (`site.js`, `api.js`, `admin.js`) and use kebab-case for asset and content filenames. Preserve `.js` extensions in relative imports. No formatter or linter is configured, so review diffs for consistency. When changing `public/`, increment `assetVersion` in `src/config.js` to invalidate caches.

## Testing Guidelines

Tests use `node:test` and `node:assert/strict`. Add focused files named `test/<feature>.test.js` and descriptive `test(...)` cases. Cover success, validation, and security-sensitive failure paths. Tests that create posts must clean them up in `finally` blocks and rebuild the search index when needed. Run `npm test` before every pull request; the repository defines no numeric coverage threshold.

## Commit & Pull Request Guidelines

Recent history favors short subjects such as `feat: add university study notes archive` and `fix1.0: harden admin security`. Prefer an imperative Conventional Commit-style prefix (`feat:`, `fix:`, `test:`, `docs:`) and keep each commit focused. Pull requests should explain behavior changes, list verification commands, link related issues, and include screenshots for template or CSS changes. Call out configuration, content-schema, or security implications explicitly.

## Security & Configuration

Never commit `.env`, passwords, session secrets, or uploaded private material. Keep `.env.example` limited to placeholders. Validate slugs and uploaded file content server-side, preserve CSRF checks for admin writes, and keep raw HTML disabled in Markdown rendering.
