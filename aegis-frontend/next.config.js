/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@poseidon/evm-sdk'],
};
module.exports = nextConfig;
