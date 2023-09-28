<template>
  <App />
</template>

<script></script>

<style>
  :root {
    --color-gold: #f5a714;
    --color-text-on-gold: #4e3405;
    --color-muted: #94a8ff;
    --color-light-dark: #0a317c;
    --color-lighter-dark: #072256;
    --color-dark: #04122f;

    --body-bg: var(--color-dark);
    --border-color: var(--color-muted);
  }

  html {
    font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
      'Helvetica Neue', Arial, sans-serif;
    -moz-osx-font-smoothing: grayscale;
    -webkit-font-smoothing: antialiased;
    box-sizing: border-box;
    text-rendering: optimizeLegibility;
  }

  body {
    margin: 0;
    color: white;
    background: var(--body-bg);
    height: 100vh;
    overflow: hidden;
    text-align: center;
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
    margin: 0;
  }

  canvas {
    outline: none !important;
  }

  input[type='range'] {
    background: var(--color-lighter-dark);
    accent-color: white !important;
  }

  label {
    display: inline-block;
  }

  input {
    display: block;
    margin: 0 auto;
  }

  input[type='radio'].btn {
    display: none;
  }

  label:has(input[type='radio']) {
    background: var(--color-lighter-dark);
    padding: 0.5rem 1rem;
    cursor: pointer;
    user-select: none;
    border-radius: 0.5rem;
  }

  label:has(input[type='radio']):hover {
    background: var(--color-light-dark);
  }
  label:has(input[type='radio'])[selected='true'] {
    background: var(--color-gold);
    color: var(--color-text-on-gold);
  }

  .heading {
    font-size: 3rem;
    font-weight: 900;
    text-rendering: geometricPrecision;
  }

  .subheading {
    font-size: 1.5rem;
    font-weight: 900;
    text-rendering: geometricPrecision;
  }

  .muted-text {
    font-size: 1rem;
    font-weight: 400;
    color: var(--color-muted);
  }

  .auto-flow-big > * + * {
    margin-top: clamp(3rem, 8vh, 5.75rem);
  }

  .auto-flow-small > * + * {
    margin-top: 1rem;
  }

  .container {
    margin: 0 auto;
  }

  [class*='rotate-'] {
    transform-origin: bottom bottom;
    transform: rotate(var(--tw-rotate, 0deg));
  }
</style>
