/**
 * Match a scanned product label (e.g. from a barcode / GS1 lookup) to StatCan-style
 * product strings. Matching is near-exact on the descriptive text and ignores
 * pack size numbers and common unit words (metric and a few imperial aliases).
 */

const UNIT_AND_PACK_TOKENS =
    /\b(per\s+kilogram|per\s+kg|kilograms?|kgs?|grams?|\bg\b|millilitres?|milliliters?|millilitre|milliliter|ml\b|litres?|liters?|\bl\b|dozen|doz\.?|units?|ounces?|oz\b|pounds?|lbs?|cups?)\b/gi;

/**
 * Lowercase, strip parenthetical qualifiers, numbers, unit words, and punctuation
 * so two labels that differ only by size or unit still compare as the same core.
 */
export function normalizeProductLabelForBarcodeMatch(input: string): string {
    let s = input.normalize('NFKC').toLowerCase();
    s = s.replace(/[\u2018\u2019'`´]/g, '');
    s = s.replace(/\([^)]*\)/g, ' ');
    // Pack size glued to a unit letter (e.g. "454g", "2l") so digit runs still strip cleanly
    s = s.replace(/\d+\.?\d*(?:kg|ml|mg|oz|lb|g|l)s?\b/gi, ' ');
    s = s.replace(/\b\d+\.?\d*\b/g, ' ');
    s = s.replace(UNIT_AND_PACK_TOKENS, ' ');
    s = s.replace(/[^a-z]+/g, ' ');
    s = s.replace(/\s+/g, ' ').trim();
    return s;
}

export function levenshtein(a: string, b: string): number {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;

    const prev = new Array<number>(b.length + 1);
    const curr = new Array<number>(b.length + 1);
    for (let j = 0; j <= b.length; j++) prev[j] = j;

    for (let i = 1; i <= a.length; i++) {
        curr[0] = i;
        const ca = a.charCodeAt(i - 1);
        for (let j = 1; j <= b.length; j++) {
            const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
            curr[j] = Math.min(
                prev[j] + 1,
                curr[j - 1] + 1,
                prev[j - 1] + cost
            );
        }
        for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
    }
    return prev[b.length];
}

export type BarcodeMatchOptions = {
    /** Minimum similarity (0–1) for a non-identical normalized core. Default 0.92. */
    minSimilarity?: number;
    /** Short normalized strings must match exactly. Default 5. */
    shortCoreExactMaxLen?: number;
};

/**
 * Similarity in [0, 1] based on normalized cores; 1 means identical after normalization.
 */
export function barcodeLabelSimilarity(a: string, b: string): number {
    const ca = normalizeProductLabelForBarcodeMatch(a);
    const cb = normalizeProductLabelForBarcodeMatch(b);
    if (!ca.length && !cb.length) return 1;
    if (!ca.length || !cb.length) return 0;
    if (ca === cb) return 1;
    const dist = levenshtein(ca, cb);
    const denom = Math.max(ca.length, cb.length);
    return 1 - dist / denom;
}

export type BarcodeMatchResult = {
    product: string;
    score: number;
};

/**
 * Pick the catalog product that best matches the scanned label.
 * Returns null if nothing meets the similarity threshold.
 */
export function findBestBarcodeProductMatch(
    scannedLabel: string,
    products: readonly string[],
    options?: BarcodeMatchOptions
): BarcodeMatchResult | null {
    const minSimilarity = options?.minSimilarity ?? 0.92;
    const shortExactMax = options?.shortCoreExactMaxLen ?? 5;

    let best: BarcodeMatchResult | null = null;

    for (const product of products) {
        const ca = normalizeProductLabelForBarcodeMatch(scannedLabel);
        const cb = normalizeProductLabelForBarcodeMatch(product);
        const maxLen = Math.max(ca.length, cb.length);

        let score: number;
        if (ca === cb) {
            score = 1;
        } else if (maxLen <= shortExactMax) {
            score = 0;
        } else {
            score = barcodeLabelSimilarity(scannedLabel, product);
        }

        if (score < minSimilarity) continue;
        if (!best || score > best.score || (score === best.score && product.length < best.product.length)) {
            best = { product, score };
        }
    }

    return best;
}
