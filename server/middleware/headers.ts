export default defineEventHandler((event) => {
  event.res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  event.res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
});
