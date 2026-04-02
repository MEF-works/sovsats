import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/core/index.ts",
    "react/index": "src/react/index.ts",
    "adapters/next/index": "src/adapters/next/index.ts",
    "adapters/express/index": "src/adapters/express/index.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ["react", "react-dom", "react/jsx-runtime", "framer-motion", "next/server", "express"],
});
