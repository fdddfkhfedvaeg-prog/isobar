#!/usr/bin/env sh
# CI build for Netlify / Cloudflare: build, upload source maps to Sentry when configured, then strip them.
set -eu
npm run build
if [ -n "${SENTRY_AUTH_TOKEN:-}" ] && [ -n "${SENTRY_ORG:-}" ] && [ -n "${SENTRY_PROJECT:-}" ]; then
  npx --yes @sentry/cli sourcemaps inject dist
  npx --yes @sentry/cli sourcemaps upload --org "$SENTRY_ORG" --project "$SENTRY_PROJECT" dist
fi
find dist -name '*.map' -delete
