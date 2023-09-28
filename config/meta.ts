import type { NuxtOptionsHead } from '@nuxt/types/config/head';
import { description } from '../package.json';

const meta: NuxtOptionsHead = {
  title: 'Song Timer',
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    {
      hid: 'description',
      name: 'description',
      content: description,
    },
  ],
  link: [
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;900&display=swap',
    },
  ],
  noscript: [
    {
      innerHTML: 'This application requires JavaScript.',
    },
  ],
};

export { meta };
