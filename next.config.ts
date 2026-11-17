import type { NextConfig } from "next";

// Upload de documentos (PDF, DOCX, imagens) via server action. O padrão do
// Next é 1 MB, pequeno para peças e anexos de processos.
const LIMITE_UPLOAD = "20mb";

// Cabeçalhos de segurança em todas as respostas.
const CABECALHOS_SEGURANCA = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: CABECALHOS_SEGURANCA }];
  },
  experimental: {
    serverActions: { bodySizeLimit: LIMITE_UPLOAD },
    // O proxy (src/proxy.ts) também bufferiza o corpo da requisição.
    proxyClientMaxBodySize: LIMITE_UPLOAD,
  },
};

export default nextConfig;
