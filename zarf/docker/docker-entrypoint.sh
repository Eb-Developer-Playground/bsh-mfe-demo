#!/bin/sh
# Runtime env.config.json injector
# Reads environment variables and overwrites env.config.json before starting nginx.
# This lets the same Docker image run across dev/staging/prod without rebuild.

set -e

CONFIG_FILE="${CONFIG_FILE:-/usr/share/nginx/html/env.config.json}"

if [ -f "$CONFIG_FILE" ]; then
    echo "docker-entrypoint: Reading existing $CONFIG_FILE"

    PRODUCTION="${ENV_PRODUCTION:-$(node -e "console.log(require('$CONFIG_FILE').production)")}"
    API_URL="${ENV_API_URL:-$(node -e "console.log(require('$CONFIG_FILE').apiUrl)")}"
    SCOPE="${ENV_SCOPE:-$(node -e "console.log(require('$CONFIG_FILE').scope)")}"
    CDN_URL="${ENV_CDN_URL:-$(node -e "console.log(require('$CONFIG_FILE').cdnUrl)")}"

    echo "docker-entrypoint: Writing env.config.json with:"
    echo "  production  => $PRODUCTION"
    echo "  apiUrl      => $API_URL"
    echo "  scope       => $SCOPE"
    echo "  cdnUrl      => $CDN_URL"

    cat > "$CONFIG_FILE" <<EOF
{
  "production": ${PRODUCTION:-false},
  "apiUrl": "${API_URL}",
  "scope": "${SCOPE}",
  "cdnUrl": "${CDN_URL}"
}
EOF
else
    echo "docker-entrypoint: WARNING — $CONFIG_FILE not found, skipping env injection."
fi

echo "docker-entrypoint: Starting nginx..."
exec nginx -g 'daemon off;'
