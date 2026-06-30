# Suggested Commands for WriteFlow

## Testing
- Run all unit tests: `pnpm run test`
- Run specific test file: `pnpm run test -- tests/services/SearchService.test.ts` (NOTE: uses `--` separator)
- Run E2E tests: `pnpm run test:e2e`

## Linting
- Lint: `pnpm run lint`
- Auto-lint happens in pre-commit hook via lint-staged

## Development
- Dev mode: `pnpm run dev` (starts Electron + Vite dev server on port 3002)
- Build: `pnpm run build`

## Git
- Commits use Conventional Commits format in zh-TW
- Commit-msg hook validates format
- Pre-commit runs ESLint

## Notes
- Windows platform: use forward slashes `/` for paths in code
- Node.js `path.join()` produces backslashes on Windows — normalize when using as Map keys
