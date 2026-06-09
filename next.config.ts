import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Fija la raíz del proyecto (hay un package-lock.json suelto en el home que confunde
  // la detección automática de workspace de Turbopack).
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
