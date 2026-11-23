import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Imagens locais pequenas, servidas pelo próprio site; o otimizador não traz ganho aqui.
      '@next/next/no-img-element': 'off'
    }
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', '.data/**', 'drizzle/**'])
]);
