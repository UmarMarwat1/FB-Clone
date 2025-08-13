/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js']
  },
  api: {
    bodyParser: {
      sizeLimit: '50mb'
    },
    responseLimit: false
  }
};

export default nextConfig;
