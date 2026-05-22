#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created guacamole/.env. Edit POSTGRES_PASSWORD before production use."
fi
if [ ! -f initdb.sql ]; then
  echo "Generating PostgreSQL initdb.sql from official guacamole/guacamole image..."
  docker run --rm guacamole/guacamole:1.6.0 /opt/guacamole/bin/initdb.sh --postgresql > initdb.sql
fi
docker compose -f docker-compose.guacamole.yml --env-file .env up -d
echo "Guacamole should be reachable at: http://<this-server-ip>:8080/guacamole"
echo "Default first login: guacadmin / guacadmin. Change it immediately."
