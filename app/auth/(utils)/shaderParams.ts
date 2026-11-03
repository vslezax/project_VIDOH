// (utils)/shaderStops.ts
import { mix } from './colorMix';

export const shaderStops = (t: number) => [
    { pos: 0.0,  color: mix('#12111F', '#0E1A00', t) },
    { pos: 0.15, color: mix('#272445', '#1E3100', t) },
    { pos: 0.5,  color: mix('#988FFC', '#F2FFC9', t) }, // см. ниже
    { pos: 0.65, color: mix('#CECAFC', '#F2FFC9', t) },
    { pos: 1.0,  color: '#FFFFFF' },
];