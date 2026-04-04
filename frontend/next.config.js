/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * Fix Google OAuth popup blocked by Cross-Origin-Opener-Policy (COOP).
   *
   * By default Next.js sets COOP to "same-origin" which prevents Google's
   * OAuth popup from communicating back via window.postMessage.
   * Setting it to "same-origin-allow-popups" allows the popup flow while
   * still protecting against cross-origin attacks.
   */
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "unsafe-none",
          },
        ],
      },
    ];
  },

  // Allow images from Google user avatars
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

module.exports = nextConfig;
