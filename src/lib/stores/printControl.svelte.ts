/**
 * Lets the page put a "Print" button in the layout's header (next to the
 * language switcher) without the header needing to know anything about the
 * page's own search/results state. The page owns when a print is possible
 * and what happens when the button is pressed; the layout just renders it.
 */
export const printControl: { visible: boolean; onPrint: (() => void) | null } = $state({
	visible: false,
	onPrint: null
});
