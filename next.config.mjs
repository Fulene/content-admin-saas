/** @type {import("next").NextConfig} */
const isDevelopment = process.env.NODE_ENV !== "production";
const developmentConnectSources = isDevelopment
  ? [
      "http://localhost:*",
      "http://127.0.0.1:*",
      "ws://localhost:*",
      "ws://127.0.0.1:*",
    ]
  : [];
const developmentImageSources = isDevelopment
  ? ["http://localhost:*", "http://127.0.0.1:*"]
  : [];

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      [
        "img-src",
        "'self'",
        "data:",
        "blob:",
        "https://*.supabase.co",
        ...developmentImageSources,
      ].join(" "),
      "font-src 'self' data:",
      [
        "connect-src",
        "'self'",
        "https://*.supabase.co",
        "wss://*.supabase.co",
        ...developmentConnectSources,
      ].join(" "),
    ].join("; "),
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

const nextConfig = {
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
