import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    turbopackFileSystemCacheForDev: true,
    serverActions: {
      // 允许你的域名进行 Server Actions 和 RSC 请求
      allowedOrigins: [
        "cyberc3-cloud-server.sjtu.edu.cn", 
        "localhost:3000", 
        "127.0.0.1:3000"
      ],
    },
  },
  // 忽略 TypeScript 错误，避免编译失败
  typescript: {
    ignoreBuildErrors: true,
  },
};

// 忽略 ESLint 错误
export const eslint = {
  ignoreDuringBuilds: true,
};

export default nextConfig;