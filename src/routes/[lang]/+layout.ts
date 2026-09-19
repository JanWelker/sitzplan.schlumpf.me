import { error } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';
import { isSupportedLocale, getMessages } from '$lib/i18n';

export const prerender = true;

export const load: LayoutLoad = ({ params }) => {
	if (!isSupportedLocale(params.lang)) {
		error(404, 'Not found');
	}
	return {
		locale: params.lang,
		messages: getMessages(params.lang)
	};
};
