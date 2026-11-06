#!/bin/sh
set -eu
# Render attaches the disk after the image is built.
if [ "$(id -u)" = "0" ]; then
  chown node:node /var/data
  exec setpriv --reuid=node --regid=node --init-groups "$@"
fi
exec "$@"
