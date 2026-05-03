import {
    barcodeLabelSimilarity,
    findBestBarcodeProductMatch,
    normalizeProductLabelForBarcodeMatch
} from '../src/barcodeProductMatch';

describe('normalizeProductLabelForBarcodeMatch (unit-agnostic)', () => {
    test('strips gram amounts and the word grams', () => {
        expect(normalizeProductLabelForBarcodeMatch('Strawberries, 454 grams')).toBe('strawberries');
        expect(normalizeProductLabelForBarcodeMatch('STRAWBERRIES 454 G')).toBe('strawberries');
    });

    test('treats per kilogram / per kg as ignorable pack context', () => {
        expect(normalizeProductLabelForBarcodeMatch('Apples, per kilogram')).toBe('apples');
        expect(normalizeProductLabelForBarcodeMatch('APPLES PER KG')).toBe('apples');
    });

    test('strips litre / millilitre amounts and units', () => {
        expect(normalizeProductLabelForBarcodeMatch('Milk, 2 litres')).toBe('milk');
        expect(normalizeProductLabelForBarcodeMatch('Milk 2 L')).toBe('milk');
        expect(normalizeProductLabelForBarcodeMatch('Mayonnaise, 890 millilitres')).toBe('mayonnaise');
    });

    test('removes parenthetical qualifiers that are not part of the core name', () => {
        expect(normalizeProductLabelForBarcodeMatch('Tea (20 bags)')).toBe('tea');
    });
});

describe('barcodeLabelSimilarity (near-exact on core text)', () => {
    test('returns 1 when labels differ only by size and units', () => {
        expect(
            barcodeLabelSimilarity(
                'Strawberries 454g',
                'Strawberries, 454 grams'
            )
        ).toBe(1);
    });

    test('returns 1 for equivalent StatCan phrasing vs retail scan text', () => {
        expect(
            barcodeLabelSimilarity(
                'White bread 675g',
                'White bread, 675 grams'
            )
        ).toBe(1);
    });

    test('is below 1 for clearly different product names', () => {
        expect(barcodeLabelSimilarity('Peanut butter', 'Almond butter')).toBeLessThan(0.92);
    });
});

describe('findBestBarcodeProductMatch', () => {
    const catalog = [
        'Strawberries, 454 grams',
        'Apples, per kilogram',
        'Peanut butter, 1 kilogram',
        'White bread, 675 grams'
    ];

    test('finds the catalog row when the scan uses different units or spacing', () => {
        expect(findBestBarcodeProductMatch('Strawberries 454 g', catalog)).toEqual({
            product: 'Strawberries, 454 grams',
            score: 1
        });
    });

    test('prefers the best-scoring row among several plausible matches', () => {
        const extended = [...catalog, 'Frozen strawberries, 600 grams'];
        expect(findBestBarcodeProductMatch('Strawberries, 454 grams', extended)?.product).toBe(
            'Strawberries, 454 grams'
        );
        expect(findBestBarcodeProductMatch('Frozen strawberries 600g', extended)?.product).toBe(
            'Frozen strawberries, 600 grams'
        );
    });

    test('returns null when nothing is close enough to the scanned core', () => {
        expect(findBestBarcodeProductMatch('Almond milk 1L', catalog)).toBeNull();
    });
});
