import type { Handle } from '@sveltejs/kit';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '$lib/i18n';

export const handle: Handle = async ({ event, resolve }) => {
	const segment = event.url.pathname.split('/')[1];
	const lang: string = (SUPPORTED_LOCALES as readonly string[]).includes(segment)
		? segment
		: DEFAULT_LOCALE;
	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%sveltekit.lang%', lang)
	});
};
