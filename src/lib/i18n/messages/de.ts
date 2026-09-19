import type { Messages } from './types';

const de: Messages = {
	appTitle: 'Sitzplan',
	tagline: 'Geschäftsnummer eingeben und die Sitze der beteiligten Ratsmitglieder sehen.',
	search: {
		label: 'Curia-Vista-Geschäftsnummer(n)',
		placeholder: 'z. B. 26.3533, 26.006',
		help: 'Mehrere Nummern durch Komma trennen.',
		button: 'Suchen'
	},
	roles: {
		rapporteur: 'Berichterstattung',
		submitter: 'Eingereicht von',
		contester: 'Bekämpft von'
	},
	chambers: {
		nr: 'Nationalrat',
		sr: 'Ständerat'
	},
	unseated: {
		title: 'Ohne Sitzplatz',
		committee: 'Kommission',
		parlGroup: 'Fraktion',
		notCurrentlySeated: 'Aktuell nicht im Rat'
	},
	errors: {
		invalidNumber: 'Ungültige Geschäftsnummer: {number}',
		businessNotFound: 'Geschäft {number} wurde nicht gefunden.',
		rosterUnavailable: 'Sitzplan-Daten sind momentan nicht abrufbar. Bitte später erneut versuchen.'
	},
	legend: {
		title: 'Fraktionen'
	},
	seatTooltip: {
		canton: 'Kanton',
		party: 'Fraktion'
	},
	languageSwitcher: {
		label: 'Sprache'
	},
	footer: {
		source: 'Quelle: Parlamentsdienste der Bundesversammlung, Bern. Daten abgerufen am {date}.',
		disclaimer: 'Inoffizielle Darstellung, keine amtliche Publikation der Bundesversammlung.'
	},
	loading: 'Wird geladen …',
	noResults: 'Bitte eine oder mehrere Geschäftsnummern eingeben.'
};

export default de;
