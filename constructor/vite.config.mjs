import { defineConfig } from 'vite';
export default defineConfig({ base: '/constructor/', build: { outDir: 'dist/client' }, server: { port: 5210, proxy: { '/api/constructor': 'http://127.0.0.1:3210' } } });
