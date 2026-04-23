import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // better-sqlite3 ships native binaries; keep it external so the Next bundler
  // doesn't try to bundle them into the server build.
  serverExternalPackages: ["better-sqlite3", "@prisma/client", "prisma"],
};

export default nextConfig;
