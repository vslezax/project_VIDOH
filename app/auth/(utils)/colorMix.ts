type RGB = [number, number, number];

const hexToRgb = (hex: string): RGB => {
    const h = hex.replace('#', '');
    return [
        parseInt(h.slice(0, 2), 16),
        parseInt(h.slice(2, 4), 16),
        parseInt(h.slice(4, 6), 16),
    ];
};

const rgbToHex = ([r, g, b]: RGB) =>
    '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

/** Аналог color-mix(in srgb, A t%, B), где t — доля A (0..1). */
export const mix = (a: string, b: string, t: number): string => {
    const A = hexToRgb(a);
    const B = hexToRgb(b);
    return rgbToHex([
        A[0] * t + B[0] * (1 - t),
        A[1] * t + B[1] * (1 - t),
        A[2] * t + B[2] * (1 - t),
    ]);
};