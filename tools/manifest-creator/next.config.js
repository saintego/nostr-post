/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  basePath: '/nostr-post/manifest-creator',
  assetPrefix: '/nostr-post/manifest-creator',
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;