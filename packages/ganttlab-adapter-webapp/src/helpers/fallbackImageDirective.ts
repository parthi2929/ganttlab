import Vue from 'vue';

// A simple directive that replaces the image src with a fallback when the original fails to load.
// Usage: v-fallback-src="fallbackUrl" or v-fallback-src="'person'" to use built-in fallbacks
// Default fallback points to a static asset in public/images (fallback-person.svg)
// Uses BASE_URL to ensure correct paths in different deployment environments (local, GH Pages, etc.)
const defaultFallback = `${process.env.BASE_URL}images/fallback-person.svg`;

function mapFallback(value?: string): string {
  if (!value) return defaultFallback;
  // allow short names mapping to known fallback assets
  if (value === 'person' || value === 'user')
    return `${process.env.BASE_URL}images/fallback-person.svg`;
  if (value === 'cube' || value === 'project')
    return `${process.env.BASE_URL}images/fallback-cube.svg`;
  // otherwise assume it's a URL/path provided by caller
  return value;
}

interface ImageElementWithHandler extends HTMLImageElement {
  fallbackOnError?: () => void;
}

Vue.directive('fallback-src', {
  bind(el: HTMLElement, binding: { value?: string }) {
    const img = el as ImageElementWithHandler;
    const fallback = mapFallback(binding && binding.value);

    function onError() {
      if (img.getAttribute('data-fallback-applied')) return;
      img.setAttribute('data-fallback-applied', 'true');
      img.src = fallback;
    }

    img.addEventListener('error', onError);
    // store the handler so it can be removed later if needed
    img.fallbackOnError = onError;
  },
  unbind(el: HTMLElement) {
    const img = el as ImageElementWithHandler;
    const handler = img.fallbackOnError;
    if (handler) img.removeEventListener('error', handler);
  },
});

export default {};
