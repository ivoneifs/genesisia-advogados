import type { NextConfig } from "next";

// Upload de documentos (PDF, DOCX, imagens) via server action. O padrão do
// Next é 1 MB, pequeno para peças e anexos de processos.
const LIMITE_UPLOAD = "20mb";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: LIMITE_UPLOAD },
    // O proxy (src/proxy.ts) também bufferiza o corpo da requisição.
    proxyClientMaxBodySize: LIMITE_UPLOAD,
  },
};

export default nextConfig;
