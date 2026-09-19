import type { Locale } from '../api/types';
import type { Messages } from './messages/types';
import de from './messages/de';
import fr from './messages/fr';
import it from './messages/it';

export const SUPPORTED_LOCALES: Locale[] = ['de', 'fr', 'it'];
export const DEFAULT_LOCALE: Locale = 'de';

const catalogs: Record<Locale, Messages> = { de, fr, it };

export function isSupportedLocale(value: string): value is Locale {
	return (SUPPORTED_LOCALES as string[]).includes(value);
}

export function getMessages(locale: Locale): Messages {
	return catalogs[locale] ?? catalogs[DEFAULT_LOCALE];
}

/** Resolves a `navigator.language`-style tag (e.g. "fr-CH") to a supported locale, defaulting to German. */
export function detectLocale(navigatorLanguage: string | null | undefined): Locale {
	const lang = (navigatorLanguage ?? '').slice(0, 2).toLowerCase();
	return isSupportedLocale(lang) ? lang : DEFAULT_LOCALE;
}

/** Looks up a dot-path key (e.g. "roles.rapporteur") and substitutes `{var}` placeholders. */
export function translate(messages: Messages, key: string, vars?: Record<string, string>): string {
	const parts = key.split('.');
	let value: unknown = messages;
	for (const part of parts) {
		if (typeof value !== 'object' || value === null) return key;
		value = (value as Record<string, unknown>)[part];
	}
	if (typeof value !== 'string') return key;
	if (!vars) return value;
	return value.replace(/\{(\w+)\}/g, (_match, name: string) => vars[name] ?? `{${name}}`);
}
