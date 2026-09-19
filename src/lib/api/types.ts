export type Locale = 'de' | 'fr' | 'it';

export type Chamber = 'nr' | 'sr';

/** Raw OData date wire format, e.g. "/Date(1779321600000)/". */
export type ODataDate = string | null;

export interface BusinessRow {
	ID: number;
	BusinessShortNumber: string;
	Title: string;
	BusinessTypeName: string;
	SubmissionCouncilName: string | null;
}

export interface BusinessRoleRow {
	ID: string;
	BusinessNumber: number;
	BusinessShortNumber: string;
	Role: number;
	RoleName: string;
	MemberCouncilNumber: number | null;
	CommitteeNumber: number | null;
	ParlGroupNumber: number | null;
}

export interface RapporteurRow {
	ID: string;
	BusinessNumber: number;
	BusinessShortNumber: string;
	MemberCouncilNumber: number;
	FirstName: string;
	LastName: string;
}

export interface MemberCouncilRow {
	PersonNumber: number;
	FirstName: string;
	LastName: string;
	Council: number | null;
	CouncilAbbreviation: string | null;
	CantonAbbreviation: string | null;
	ParlGroupNumber: number | null;
	ParlGroupAbbreviation: string | null;
	ParlGroupName: string | null;
	Active: boolean;
}

export interface SeatOrganisationRow {
	SeatNumber: number;
	PersonNumber: number;
	FirstName: string;
	LastName: string;
	CantonAbbreviation: string | null;
	ParlGroupNumber: number | null;
	ParlGroupName: string | null;
}

export interface CommitteeRow {
	CommitteeNumber: number;
	CommitteeName: string;
}

export interface ParlGroupRow {
	ParlGroupNumber: number;
	ParlGroupAbbreviation: string;
	ParlGroupName: string;
	/** Wire format like "0x005E29", or null when not yet assigned by the Parliamentary Services. */
	ParlGroupColour: string | null;
}
