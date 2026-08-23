import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// connect-src: Supabase Realtime necesita wss:// explícito.
// En desarrollo permitimos también sockets locales para HMR/Turbopack.
const connectSrc = [
  "'self'",
  "*.supabase.co",
  "wss://*.supabase.co",
  "api.ycloud.com",
  "openrouter.ai",
  "services.leadconnectorhq.com",
  ...(isDev
    ? [
        "ws://localhost:*",
        "http://localhost:*",
        "ws://127.0.0.1:*",
        "http://127.0.0.1:*",
      ]
    : []),
].join(" ");

const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: *.supabase.co",
      "media-src 'self' blob: *.supabase.co",
      "font-src 'self' data:",
      `connect-src ${connectSrc}`,
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Producción self-hosted en Easypanel / Docker
  output: "standalone",

  // Configuración únicamente para desarrollo / GitHub Codespaces
  ...(isDev && {
    experimental: {
      mcpServer: true,

      serverActions: {
        allowedOrigins: [
          "localhost:3000",
          "127.0.0.1:3000",
          "localhost:3001",
          "127.0.0.1:3001",

          // Codespace actual
          "scaling-spoon-p75g5x594j92w74-3000.app.github.dev",
          "scaling-spoon-p75g5x594j92w74-3001.app.github.dev",

          // Permite otros puertos del mismo Codespace
          "*.app.github.dev",
        ],
      },
    },

    allowedDevOrigins: [
      "localhost",
      "127.0.0.1",
      "scaling-spoon-p75g5x594j92w74-3000.app.github.dev",
      "scaling-spoon-p75g5x594j92w74-3001.app.github.dev",
      "*.app.github.dev",
    ],
  }),

  headers: async () => [
    {
      source: "/(.*)",
      headers: securityHeaders,
    },
  ],

  // Evita 404 de probes legacy al favicon
  rewrites: async () => [
    {
      source: "/favicon.ico",
      destination: "/icon.svg",
    },
  ],
};

export default nextConfig;