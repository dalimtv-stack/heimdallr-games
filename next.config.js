/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['cheerio']
  },
  images: {
    domains: ['fitgirl-repacks.site', 'riotpixels.com', 'via.placeholder.com', 'www.riotpixels.com']
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store' }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
