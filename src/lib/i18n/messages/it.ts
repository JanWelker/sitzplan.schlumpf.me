import type { Messages } from './types';

const it: Messages = {
	appTitle: 'Piano dei posti',
	tagline: 'Inserisci un numero di oggetto e visualizza i posti dei membri coinvolti.',
	search: {
		label: 'Numero/i di oggetto Curia Vista',
		placeholder: 'p. es. 26.3533, 26.006',
		help: 'Separa più numeri con una virgola.',
		button: 'Cerca'
	},
	roles: {
		rapporteur: 'Relazione',
		submitter: 'Depositato da',
		contester: 'Contestato da'
	},
	chambers: {
		nr: 'Consiglio nazionale',
		sr: 'Consiglio degli Stati'
	},
	unseated: {
		title: 'Senza posto',
		committee: 'Commissione',
		parlGroup: 'Gruppo parlamentare',
		notCurrentlySeated: 'Attualmente non in Consiglio'
	},
	errors: {
		invalidNumber: 'Numero di oggetto non valido: {number}',
		businessNotFound: 'L’oggetto {number} non è stato trovato.',
		rosterUnavailable:
			'I dati del piano dei posti non sono al momento disponibili. Riprova più tardi.'
	},
	legend: {
		title: 'Gruppi parlamentari'
	},
	seatTooltip: {
		canton: 'Cantone',
		party: 'Gruppo'
	},
	languageSwitcher: {
		label: 'Lingua'
	},
	footer: {
		source:
			'Fonte: Servizi del Parlamento dell’Assemblea federale, Berna. Dati consultati il {date}.',
		disclaimer:
			'Rappresentazione non ufficiale, priva di valore di pubblicazione ufficiale dell’Assemblea federale.'
	},
	loading: 'Caricamento …',
	noResults: 'Inserisci uno o più numeri di oggetto.'
};

export default it;
