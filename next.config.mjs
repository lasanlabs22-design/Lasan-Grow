/** @type {import('next').NextConfig} */
const nextConfig = {
  // PGlite ships WASM + data files that must be loaded from node_modules, not bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
