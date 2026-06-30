# WriteFlow Project Overview

## Purpose
Electron + Vue 3 desktop app for managing Obsidian vault articles and publishing to Astro blog.

## Tech Stack
- **Frontend**: Vue 3, TypeScript, Pinia (state management), Vite, DaisyUI/Tailwind CSS
- **Backend (main process)**: Electron (Node.js), TypeScript
- **Testing**: Vitest (unit), Playwright (E2E)
- **Tooling**: pnpm, ESLint, Husky, commitlint

## Key Directories
- `src/components/` - Vue components
- `src/stores/` - Pinia stores
- `src/services/` - Frontend services (renderer process)
- `src/main/services/` - Main process services (Electron IPC handlers)
- `src/composables/` - Vue composables
- `src/types/` - TypeScript types/enums
- `tests/` - All tests (services/, stores/, e2e/, components/, utils/)

## Active Branch
`feature/s01-full-text-search` - Full text search feature (S-01)

## Key Services
- `SearchService` (main process): builds in-memory index of .md files, handles search queries via IPC
- `ArticleService`: loads articles from vault directory
- `FileWatchService`: watches for file changes and triggers incremental index updates

## IPC Channels (search)
- `search:build-index` - builds search index for given articlesDir
- `search:query` - queries the index

## Known Pre-existing Issues
- `tests/services/AIService.test.ts` fails to load due to missing `@anthropic-ai/sdk` package
