import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  //  Move it out of experimental to the root level here:
  outputFileTracingRoot: path.join(__dirname, "../../"),
  
  async redirects() {
    return [
      {
        source: "/",
        destination: "/dashboard",
        permanent: true, // Tells browsers to cache this redirect for speed
      },
    ];
  },
};

export default nextConfig;