#!/bin/sh
set -e

# Call the Prisma CLI directly via Node so __dirname resolves to
# node_modules/prisma/build/ where the WASM file actually lives.
# Using `npx prisma` or copying only .bin/prisma breaks because Docker COPY
# follows symlinks and the resulting flat file has the wrong __dirname.
node ./node_modules/prisma/build/index.js migrate deploy --schema=./prisma/schema.prisma

exec node server.js
