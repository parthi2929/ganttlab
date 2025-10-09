import Vue, { VNode } from 'vue';

// A simple directive that replaces the image src with a fallback when the original fails to load.
// Usage: v-fallback-src="fallbackUrl" or v-fallback-src="'person'" to use built-in fallbacks
// Default fallback points to a static asset in public/images (fallback-person.svg)
const defaultFallback = '/images/fallback-person.svg';

function mapFallback(value?: string): string {
  if (!value) return defaultFallback;
  // allow short names mapping to known fallback assets
  if (value === 'person' || value === "user") return '/images/fallback-person.svg';
  if (value === 'cube' || value === 'project') return '/images/fallback-cube.svg';
  // otherwise assume it's a URL/path provided by caller
  return value;
}

Vue.directive('fallback-src', {
  bind(el: HTMLElement, binding: { value?: string }, vnode: VNode) {
  const img = el as HTMLImageElement;
  const fallback = mapFallback(binding && binding.value);

    function onError() {
      if (img.getAttribute('data-fallback-applied')) return;
      img.setAttribute('data-fallback-applied', 'true');
      img.src = fallback;
    }

    img.addEventListener('error', onError);
    // store the handler so it can be removed later if needed
    (img as any).__fallback_on_error = onError;
  },
  unbind(el: HTMLElement) {
    const img = el as HTMLImageElement;
    const handler = (img as any).__fallback_on_error;
    if (handler) img.removeEventListener('error', handler);
  },
});

export default {};
