import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// base './' => statisches Hosting in beliebigem Unterpfad
export default defineConfig({ base: './', plugins: [react()] });
