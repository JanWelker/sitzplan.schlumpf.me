import type { Messages } from './types';

const fr: Messages = {
	appTitle: 'Plan des sièges',
	tagline: 'Saisissez un numéro d’objet et visualisez les sièges des membres concernés.',
	search: {
		label: 'Numéro(s) d’objet Curia Vista',
		placeholder: 'p. ex. 26.3533, 26.006',
		help: 'Séparez plusieurs numéros par une virgule.',
		button: 'Rechercher'
	},
	roles: {
		rapporteur: 'Rapport',
		submitter: 'Déposé par',
		contester: 'Combattu par'
	},
	chambers: {
		nr: 'Conseil national',
		sr: 'Conseil des États'
	},
	unseated: {
		title: 'Sans siège',
		committee: 'Commission',
		parlGroup: 'Groupe parlementaire',
		notCurrentlySeated: 'Ne siège pas actuellement'
	},
	errors: {
		invalidNumber: 'Numéro d’objet invalide : {number}',
		businessNotFound: 'L’objet {number} est introuvable.',
		rosterUnavailable:
			'Les données du plan des sièges sont momentanément indisponibles. Veuillez réessayer plus tard.'
	},
	legend: {
		title: 'Groupes parlementaires'
	},
	seatTooltip: {
		canton: 'Canton',
		party: 'Groupe'
	},
	languageSwitcher: {
		label: 'Langue'
	},
	footer: {
		source:
			'Source : Services du Parlement de l’Assemblée fédérale, Berne. Données consultées le {date}.',
		disclaimer:
			'Représentation non officielle, sans valeur de publication officielle de l’Assemblée fédérale.'
	},
	loading: 'Chargement …',
	noResults: 'Veuillez saisir un ou plusieurs numéros d’objet.'
};

export default fr;
