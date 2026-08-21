import type { EmbedOptions } from './types';
import './embed.css';

function mount(options: EmbedOptions) {
  if (!options.workspace) throw new Error('Widget workspace is required');
  const script = document.currentScript as HTMLScriptElement | null;
  const cdnBase = script?.src ? new URL('.', script.src) : new URL('.', location.href);
  const url = new URL('index.html', cdnBase);
  url.searchParams.set('workspace', options.workspace);
  url.searchParams.set('api', options.apiBase ?? location.origin);
  if (options.locale) url.searchParams.set('locale', options.locale);
  url.searchParams.set('mode', options.mode ?? 'floating');
  const frame = document.createElement('iframe');
  frame.src = url.toString(); frame.title = 'Customer support'; frame.loading = 'lazy'; frame.referrerPolicy = 'strict-origin-when-cross-origin';
  frame.setAttribute('sandbox', 'allow-forms allow-scripts allow-same-origin'); frame.setAttribute('allow', 'clipboard-write');
  frame.className = `amp-widget-frame amp-widget-${options.mode ?? 'floating'}`;
  const target = typeof options.container === 'string' ? document.querySelector(options.container) : options.container;
  (target ?? document.body).append(frame);
  return { destroy: () => frame.remove() };
}
window.AiMarketingWidget = { mount };
const current = document.currentScript as HTMLScriptElement | null;
if (current?.dataset.workspace) mount({ workspace: current.dataset.workspace, ...(current.dataset.api ? { apiBase: current.dataset.api } : {}), ...(current.dataset.locale ? { locale: current.dataset.locale as NonNullable<EmbedOptions['locale']> } : {}), mode: current.dataset.mode === 'inline' ? 'inline' : 'floating', ...(current.dataset.container ? { container: current.dataset.container } : {}) });
