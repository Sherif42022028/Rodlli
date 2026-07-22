/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@whiskeysockets/baileys', 'sharp'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || []
      config.externals.push('@whiskeysockets/baileys', 'sharp')
    }
    return config
  },
  async headers() {
    return [
      {
        source: '/widget-frame/:path*',
        headers: [
          { key: 'X-Frame-Options', value: '' },
          { key: 'Content-Security-Policy', value: 'frame-ancestors *;' }
        ]
      }
    ]
  }
};

export default nextConfig;
