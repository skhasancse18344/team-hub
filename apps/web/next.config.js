/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone", // ✅ ADD THIS

  transpilePackages: ["@repo/ui"],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;