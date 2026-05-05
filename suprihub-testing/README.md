# SupriHub Testing

This package contains automated tests for the SupriHub dispatch application.

## Test Types

- Unit tests: validate isolated backend logic and API validation behavior.
- Frontend component tests: validate React form rendering, successful submit behavior, and error display.
- Integration tests: validate that the backend API can write submissions into PostgreSQL.
- End-to-end tests: drive the browser UI through the frontend, nginx proxy, backend API, and database.

## Install

Run from this folder:

```powershell
npm install
npx playwright install chromium
```

## Run Tests

Unit and frontend component tests:

```powershell
npm run test:unit
```

Integration tests require the backend and database to be running. From the repository root:

```powershell
docker compose up -d --build db backend
cd suprihub-testing
npm run test:integration
```

End-to-end tests can start the full Docker Compose stack automatically:

```powershell
npm run test:e2e
```

If the stack is already running, skip Docker startup:

```powershell
$env:E2E_SKIP_DOCKER="true"
npm run test:e2e
```

Coverage for SonarCloud:

```powershell
npm run test:coverage
```

The coverage report is written to `suprihub-testing/coverage/lcov.info`.

## SonarCloud Notes

Use `suprihub-testing/sonar-project.properties.example` as a starting point. Replace the project key and organization with your SonarCloud values before enabling a quality gate.
