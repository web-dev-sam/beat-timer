import { defineNuxtConfig } from 'nuxt/config';
import { buildModules, meta, modules, publicRuntimeConfig } from './config';

// https://v3.nuxtjs.org/docs/directory-structure/nuxt.config
export default defineNuxtConfig({
  // https://v3.nuxtjs.org/docs/directory-structure/nuxt.config#ssr
  ssr: false,
  // https://v3.nuxtjs.org/docs/directory-structure/nuxt.config#meta
  meta,
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
