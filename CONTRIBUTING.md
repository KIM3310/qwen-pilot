# Contributing to qwen-pilot

Thank you for your interest in contributing to qwen-pilot! This guide will help you get started.

## Development Setup

1. Fork and clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/qwen-pilot.git
cd qwen-pilot
```

2. Install dependencies:

```bash
npm install
```

3. Build the project:

```bash
npm run build
```

4. Run tests:

```bash
npm test
```

## Development Workflow

1. Create a feature branch from `main`:

```bash
git checkout -b feat/my-feature
```

2. Make your changes and ensure:
   - `npm run build` compiles without errors
   - `npm test` passes all tests
   - `npm run lint` reports no issues

3. Commit with a descriptive message following [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new agent role for data engineering
fix: correct tmux pane splitting on macOS
docs: update CLI command reference
```

4. Push your branch and open a Pull Request against `main`.

## Project Structure

- `src/` -- TypeScript source code
- `__tests__/` -- Vitest test suite
- `prompts/` -- Built-in agent prompt definitions
- `workflows/` -- Built-in workflow definitions

## Code Style

- TypeScript strict mode is enabled
- Use Biome for linting and formatting: `npm run lint` / `npm run format`
- Prefer named exports over default exports
- Use `node:` prefix for Node.js built-in imports

## Testing

- Write tests using [Vitest](https://vitest.dev/)
- Place test files in `__tests__/` with `.test.ts` extension
- Run the full suite: `npm test`
- Run with coverage: `npm run test:coverage`

## Reporting Issues

Use the GitHub issue templates for bug reports and feature requests.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
