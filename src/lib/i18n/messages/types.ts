export interface Messages {
	appTitle: string;
	tagline: string;
	search: {
		label: string;
		placeholder: string;
		help: string;
		button: string;
	};
	roles: {
		rapporteur: string;
		submitter: string;
		contester: string;
	};
	chambers: {
		nr: string;
		sr: string;
	};
	unseated: {
		title: string;
		committee: string;
		parlGroup: string;
		notCurrentlySeated: string;
	};
	errors: {
		invalidNumber: string;
		businessNotFound: string;
		rosterUnavailable: string;
	};
	seatTooltip: {
		canton: string;
		party: string;
	};
	languageSwitcher: {
		label: string;
	};
	footer: {
		source: string;
		disclaimer: string;
	};
	print: {
		button: string;
		highlightedTitle: string;
		searchedNumbers: string;
	};
	loading: string;
	noResults: string;
}
