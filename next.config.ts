import type { NextConfig } from "next";

// https://qiekn.github.io/oss-wiki/logo.png  (right √)
// https://qiekn.github.io/logo.png           (wrong ×)
const repositoryName = process.env.REPOSITORY_NAME || "";
const isDev = process.env.NODE_ENV === "development";
const basePath = isDev || !repositoryName ? "" : `/${repositoryName}`;

const nextConfig: NextConfig = {
  // Static build, because we use github pages
  output: "export",

  basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined,

  // We use github pages, so no server side optimize
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
