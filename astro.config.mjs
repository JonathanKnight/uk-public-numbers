import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://JonathanKnight.github.io',
  base: '/uk-public-numbers',
  output: 'static',
  integrations: [react()],
});
