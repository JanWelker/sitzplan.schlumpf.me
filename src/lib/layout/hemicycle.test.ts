import { describe, expect, it } from 'vitest';
import { generateGroupedHemicycleLayout } from './hemicycle';

describe('generateGroupedHemicycleLayout', () => {
	it('produces exactly 200 positions for the Nationalrat (8 arcs)', () => {
		const positions = generateGroupedHemicycleLayout([74, 48, 39, 46, 26, 12, 1], 8);
		expect(positions).toHaveLength(74 + 48 + 39 + 46 + 26 + 12 + 1);
	});

	it('produces exactly 46 positions for the Ständerat (5 arcs)', () => {
		const positions = generateGroupedHemicycleLayout([15, 12, 9, 6, 4], 5);
		expect(positions).toHaveLength(46);
	});

	it('skips zero-size groups without leaving a gap for them', () => {
		const withZero = generateGroupedHemicycleLayout([10, 0, 10], 4);
		const withoutZero = generateGroupedHemicycleLayout([10, 10], 4);
		expect(withZero).toHaveLength(20);
		expect(withZero.map((p) => p.angleRad)).toEqual(withoutZero.map((p) => p.angleRad));
	});

	it('keeps each group angularly contiguous with a gap from its neighbors', () => {
		const groupSizes = [20, 20];
		const positions = generateGroupedHemicycleLayout(groupSizes, 4);
		const firstGroup = positions.slice(0, 20);
		const secondGroup = positions.slice(20);
		const maxAngleFirst = Math.max(...firstGroup.map((p) => p.angleRad));
		const minAngleSecond = Math.min(...secondGroup.map((p) => p.angleRad));
		expect(minAngleSecond).toBeGreaterThan(maxAngleFirst);
	});

	it('keeps arc seat-counts non-decreasing outward within a group', () => {
		const positions = generateGroupedHemicycleLayout([200], 8);
		const perArc = new Map<number, number>();
		for (const p of positions) perArc.set(p.arcIndex, (perArc.get(p.arcIndex) ?? 0) + 1);
		const counts = [...perArc.entries()].sort((a, b) => a[0] - b[0]).map(([, count]) => count);
		for (let i = 0; i < counts.length - 1; i++) {
			expect(counts[i]).toBeLessThanOrEqual(counts[i + 1]);
		}
	});

	it('places every seat within the upper half-plane (y <= 0)', () => {
		const positions = generateGroupedHemicycleLayout([15, 12, 9, 6, 4], 5);
		for (const p of positions) {
			expect(p.y).toBeLessThanOrEqual(0.001);
		}
	});

	it('returns an empty array when there are no seats at all', () => {
		expect(generateGroupedHemicycleLayout([], 5)).toEqual([]);
		expect(generateGroupedHemicycleLayout([0, 0], 5)).toEqual([]);
	});

	it('is deterministic across repeated calls with the same input', () => {
		const a = generateGroupedHemicycleLayout([74, 48, 39, 46, 26, 12, 1], 8);
		const b = generateGroupedHemicycleLayout([74, 48, 39, 46, 26, 12, 1], 8);
		expect(a).toEqual(b);
	});
});
