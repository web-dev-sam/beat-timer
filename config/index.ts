import { NuxtOptionsRuntimeConfig } from '@nuxt/types/config/runtime';

const publicRuntimeConfig: NuxtOptionsRuntimeConfig = {
  version: process.env.npm_package_version,
};
export { buildModules } from './buildModules';
export { modules } from './modules';
export { publicRuntimeConfig };
