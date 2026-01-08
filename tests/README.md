# Selenium E2E Tests

This folder contains Selenium-based end-to-end tests for the PCDC Data Portal.

## Notes on test design

- Tests prefer until.elementLocated over visibility checks where possible.
  - This avoids false timeouts in React where elements may exist in the DOM but not yet be visible due to transitions or re-renders.
- Tests are written defensively to handle:
  - duplicate DOM nodes
  - responsive layouts
  - late-rendered overlays

## Prerequisites

- Node.js (LTS recommended)
- Chrome installed
- npm

## Folder structure

```bash
tests/
  selenium/
    integration_tests/
      smoke.spec.js
      versionFooter.spec.js
      dictionary.spec.js
  package.json
  README.md
```

## Install dependencies

```bash
cd selenium
npm install
```

## Environment configuration

Tests default to:

```bash
BASE_URL=http://localhost
```

Override as needed:

```bash
BASE_URL=https://localhost
BASE_URL=https://localhost/dev.html
BASE_URL=https://portal.pedscommons.org
```

## Run all tests

```bash
npm test
```

## Run a single test (by name)

```bash
BASE_URL=https://localhost npm test -- -g "Data Dictionary"
```

## Skip Test

To temporarily skip a test file, rename it so it no longer matches \*.spec.js, for example:

```bash
dictionary.spec.js.skip
```
