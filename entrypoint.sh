#!/bin/sh
set -e

# Ensure the data directory exists and is writable
mkdir -p /app/data

exec node server.js
