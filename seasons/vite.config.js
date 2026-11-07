import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    server: {
        host: '0.0.0.0',
        port: 3000,
        strictPort: true,
        allowedHosts: ['3000-iomukev6049uxvc3pkadr-01b28547.us3.manus.computer'],
    },
});
