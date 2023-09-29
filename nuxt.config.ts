import { defineNuxtConfig } from 'nuxt/config';
import { buildModules, modules, publicRuntimeConfig } from './config';

// https://v3.nuxtjs.org/docs/directory-structure/nuxt.config
export default defineNuxtConfig({
  // https://v3.nuxtjs.org/docs/directory-structure/nuxt.config#ssr
  ssr: false,
  app: {
    head: {
      meta: [
        {
          hid: 'title',
          name: 'title',
          content: 'Song Timer',
        },
        {
          hid: 'description',
          name: 'description',
          content:
            "A web app to align your song's beat to your game's beat. This app is still new and was tested primarily with Beat Saber.",
        },
        {
          hid: 'og:description',
          property: 'og:description',
          content:
            "A web app to align your song's beat to your game's beat. This app is still new and was tested primarily with Beat Saber.",
        },
        {
          hid: 'og:image',
          property: 'og:image',
          content: 'https://song-timer.webry.com/meta/cover.png',
        },
        {
          hid: 'og:title',
          property: 'og:title',
          content: 'Song Timer',
        },
        {
          hid: 'og:type',
          property: 'og:type',
          content: 'website',
        },
        {
          hid: 'og:url',
          property: 'og:url',
          content: 'https://song-timer.webry.com/',
        },
        {
          hid: 'og:site_name',
          property: 'og:site_name',
          content: 'Song Timer',
        },
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      title: 'Song Timer',
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: 'anonymous',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;900&display=swap',
        },
      ],
    },
  },
  // https://v3.nuxtjs.org/docs/directory-structure/nuxt.config#publicruntimeconfig
  publicRuntimeConfig,
  // https://v3.nuxtjs.org/docs/directory-structure/nuxt.config#modules
  modules,
  // https://v3.nuxtjs.org/docs/directory-structure/nuxt.config#buildmodules
  buildModules,
});
