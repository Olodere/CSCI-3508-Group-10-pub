# docker/postgres-test.Dockerfile
# Test-only image: Debian-based Postgres + pgTAP.
# Do NOT use in production; production stays on postgres:17.11-alpine

ARG PG_VERSION=17.11
FROM postgres:${PG_VERSION}

ARG PG_VERSION

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      postgresql-17-pgtap \
 && rm -rf /var/lib/apt/lists/*