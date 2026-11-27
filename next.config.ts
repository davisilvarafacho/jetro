import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Alias local (/etc/hosts) para abrir o app por jetro.localhost, por exemplo ao testar o QR Code.
  allowedDevOrigins: ["jetro.localhost"],
};

export default nextConfig;
