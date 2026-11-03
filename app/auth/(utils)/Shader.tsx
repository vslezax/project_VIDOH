// AnimatedGradientShader.tsx
import React, { useEffect, useRef } from 'react';

export interface ColorStop {
    pos: number;
    color: string; // '#rrggbb'
}

export interface AnimatedGradientShaderProps {
    width?: number | string;
    height?: number | string;
    className?: string;
    style?: React.CSSProperties;

    // ============ 1. ГРАДИЕНТ ============
    /** Угол направления градиента, радианы. 0 = слева→направо, PI/2 = снизу→вверх */
    gradientAngle?: number;
    /** Гамма-коррекция. 0 = линейно, >0 светлое растягивается, <0 тёмное */
    gradientSoftness?: number;
    /** Сужение границы. 1 = обычный, >1 уже, <1 шире */
    gradientContrast?: number;
    /** Точка поворота градиента (0..1). 0.5 = центр */
    gradientPivot?: number;

    // ============ 2. FRACTAL DISPLACE ============
    /** Масштаб шума (базовый) */
    noiseScale?: number;
    /** Множитель частоты второй октавы */
    octave2Scale?: number;
    /** Сила смещения (амплитуда слоя 1) */
    displaceStrength?: number;
    /** Доля амплитуды слоя 2 относительно слоя 1 */
    displaceLayer2?: number;
    /** Количество октав fbm (макс 8) */
    octaves?: number;
    /** Множитель частоты между октавами fbm */
    fbmLacunarity?: number;
    /** Множитель амплитуды между октавами fbm */
    fbmGain?: number;
    /** Поворот между октавами fbm (радианы) */
    fbmRotation?: number;
    /** Начальный сдвиг фазы шума по X */
    noiseOffsetX?: number;
    /** Начальный сдвиг фазы шума по Y */
    noiseOffsetY?: number;
    /** Скорость анимации phase слоя 1 */
    phaseSpeed?: number;
    /** Скорость анимации phase слоя 2 (множитель) */
    phaseSpeed2?: number;
    /** Начальная фаза */
    phaseOffset?: number;

    // ============ 3. COLOR RAMP ============
    /** Цветовые стопы (до 8) */
    colorStops?: ColorStop[];
    /** Общая яркость */
    brightness?: number;
    /** Насыщенность (0 = ЧБ, 2 = максимум) */
    saturation?: number;

    // ============ 4. СТЕКЛО ИЗ ИСХОДНОГО ШЕЙДЕРА ============
    /** Центр линзы в UV 0..1 (бывший iMouse) */
    glassCenter?: [number, number];
    /** Прозрачность эффекта стекла 0..1 */
    glassOpacity?: number;
    /** Множитель cir (в оригинале 1.0) */
    glassStrength?: number;
    /** Частота полос ran по X (в оригинале 10.0) */
    glassScale?: number;
    /** Частота полос ran по Y (0 = строго вертикальные, как в оригинале) */
    glassScaleY?: number;
    /** Смещение фазы полос ran по X */
    glassRanOffsetX?: number;
    /** Смещение фазы полос ran по Y */
    glassRanOffsetY?: number;
    /** Амплитуда полос ran (1.0 = как в оригинале) */
    glassRanAmplitude?: number;
    /** Мягкость маски стекла (0 = без маски, применяется везде; >0 = гасится к краю радиуса) */
    glassMaskRadius?: number;
    /** Ширина зоны затухания маски стекла */
    glassMaskSoftness?: number;

    /** Пауза анимации */
    paused?: boolean;
}

const DEFAULT_STOPS: ColorStop[] = [
    { pos: 0.0, color: '#0a0a2e' },
    { pos: 0.35, color: '#3a1d6e' },
    { pos: 0.6, color: '#c2410c' },
    { pos: 0.85, color: '#fbbf24' },
    { pos: 1.0, color: '#fef3c7' },
];

const hexToRgb = (hex: string): [number, number, number] => {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const n = parseInt(full, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

const MAX_STOPS = 8;

export const AnimatedGradientShader: React.FC<AnimatedGradientShaderProps> = ({
                                                                                  width = '100%',
                                                                                  height = '100%',
                                                                                  className,
                                                                                  style,

                                                                                  // 1. Градиент
                                                                                  gradientAngle = Math.PI / 2,
                                                                                  gradientSoftness = 0.0,
                                                                                  gradientContrast = 1.0,
                                                                                  gradientPivot = 0.5,

                                                                                  // 2. Fractal displace
                                                                                  noiseScale = 3.0,
                                                                                  octave2Scale = 1.7,
                                                                                  displaceStrength = 0.35,
                                                                                  displaceLayer2 = 0.5,
                                                                                  octaves = 4,
                                                                                  fbmLacunarity = 2.02,
                                                                                  fbmGain = 0.5,
                                                                                  fbmRotation = 0.64350110879, // ~ atan2(0.6, 0.8)
                                                                                  noiseOffsetX = 0.0,
                                                                                  noiseOffsetY = 0.0,
                                                                                  phaseSpeed = 0.25,
                                                                                  phaseSpeed2 = 0.7,
                                                                                  phaseOffset = 0.0,

                                                                                  // 3. Color ramp
                                                                                  colorStops = DEFAULT_STOPS,
                                                                                  brightness = 1.0,
                                                                                  saturation = 1.0,

                                                                                  // 4. Стекло
                                                                                  glassCenter = [0.5, 0.5],
                                                                                  glassOpacity = 1.0,
                                                                                  glassStrength = 1.0,
                                                                                  glassScale = 10.0,
                                                                                  glassScaleY = 0.0,
                                                                                  glassRanOffsetX = 0.0,
                                                                                  glassRanOffsetY = 0.0,
                                                                                  glassRanAmplitude = 1.0,
                                                                                  glassMaskRadius = 1.0,
                                                                                  glassMaskSoftness = 0.15,

                                                                                  paused = false,
                                                                              }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number>(0);
    const startTimeRef = useRef<number>(performance.now());
    const pausedTimeRef = useRef<number>(0);

    // нормализация color stops
    const stopsArray: [number, number, number][] = [];
    const positionsArray: number[] = [];
    const sorted = [...colorStops].sort((a, b) => a.pos - b.pos);
    const used = sorted.slice(0, MAX_STOPS);
    while (used.length < 2) used.push({ pos: used.length, color: '#000000' });
    for (let i = 0; i < MAX_STOPS; i++) {
        const s = used[Math.min(i, used.length - 1)];
        const [r, g, b] = hexToRgb(s.color);
        stopsArray.push([r, g, b]);
        positionsArray.push(i < used.length ? s.pos : 1.0);
    }
    const stopCount = Math.min(used.length, MAX_STOPS);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const gl = canvas.getContext('webgl', { antialias: true, alpha: false });
        if (!gl) {
            console.error('WebGL не поддерживается');
            return;
        }

        const vertexSrc = `
      attribute vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

        const fragmentSrc = `
      #ifdef GL_ES
      precision highp float;
      #endif

      uniform vec2  iResolution;
      uniform float uTime;

      // 1. Градиент
      uniform float uGradientAngle;
      uniform float uGradientSoftness;
      uniform float uGradientContrast;
      uniform float uGradientPivot;

      // 2. Fractal displace
      uniform float uNoiseScale;
      uniform float uOctave2Scale;
      uniform float uDisplaceStrength;
      uniform float uDisplaceLayer2;
      uniform float uOctaves;
      uniform float uFbmLacunarity;
      uniform float uFbmGain;
      uniform float uFbmRotation;
      uniform vec2  uNoiseOffset;
      uniform float uPhase;
      uniform float uPhase2;

      // 3. Color ramp
      uniform vec3  uStops[${MAX_STOPS}];
      uniform float uStopPos[${MAX_STOPS}];
      uniform int   uStopCount;
      uniform float uBrightness;
      uniform float uSaturation;

      // 4. Стекло
      uniform vec2  uGlassCenter;
      uniform float uGlassOpacity;
      uniform float uGlassStrength;
      uniform float uGlassScale;
      uniform float uGlassScaleY;
      uniform vec2  uGlassRanOffset;
      uniform float uGlassRanAmplitude;
      uniform float uGlassMaskRadius;
      uniform float uGlassMaskSoftness;

      // ---------- шум / fbm ----------
      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
      }
      float fbm(vec2 p, float oct) {
        float v = 0.0;
        float a = 0.5;
        float cr = cos(uFbmRotation);
        float sr = sin(uFbmRotation);
        mat2 rot = mat2(cr, sr, -sr, cr);
        for (int i = 0; i < 8; i++) {
          if (float(i) >= oct) break;
          v += a * noise(p);
          p = rot * p * uFbmLacunarity;
          a *= uFbmGain;
        }
        return v;
      }

      // ---------- color ramp ----------
      vec3 ramp(float t) {
        t = clamp(t, 0.0, 1.0);
        vec3 col = uStops[0];
        for (int i = 0; i < ${MAX_STOPS - 1}; i++) {
          if (i >= uStopCount - 1) break;
          float p0 = uStopPos[i];
          float p1 = uStopPos[i + 1];
          if (t >= p0 && t <= p1) {
            float k = (t - p0) / max(p1 - p0, 1e-5);
            col = mix(uStops[i], uStops[i + 1], k);
          }
          if (t > p1) col = uStops[i + 1];
        }
        return col;
      }
      vec3 adjustSaturation(vec3 c, float s) {
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        return mix(vec3(l), c, s);
      }

      // ---------- фон: градиент + fractal displace + ramp ----------
      vec3 background(vec2 uv) {
        // 1) градиент
        vec2 dir = vec2(cos(uGradientAngle), sin(uGradientAngle));
        float grad = dot(uv - 0.5, dir) + 0.5;
        grad = clamp(grad, 0.0, 1.0);

        // pivot — сдвигаем центр градиента
        grad = clamp((grad - uGradientPivot) + 0.5, 0.0, 1.0);

        // сужение (contrast)
        grad = clamp((grad - 0.5) * uGradientContrast + 0.5, 0.0, 1.0);

        // гамма (softness)
        float gamma = exp2(-uGradientSoftness);
        grad = pow(grad, gamma);

        // 2) fractal displace
        vec2 nUv = uv * uNoiseScale + uNoiseOffset;
        float n1 = fbm(nUv + vec2(0.0, uPhase), uOctaves);
        float n2 = fbm(nUv * uOctave2Scale - vec2(uPhase2, 0.0), uOctaves);
        float displace = (n1 - 0.5) * 2.0 * uDisplaceStrength
                       + (n2 - 0.5) * uDisplaceStrength * uDisplaceLayer2;
        float g = clamp(grad + displace, 0.0, 1.0);

        // 3) color ramp
        vec3 col = ramp(g);
        col = adjustSaturation(col, uSaturation) * uBrightness;
        return col;
      }

      void mainImage(out vec4 fragColor, in vec2 fragCoord) {
        vec2 uv = fragCoord.xy / iResolution.xy;

        // --- 1..3: фон ---
        vec3 col = background(uv);

        // --- 4: СТЕКЛО ИЗ ИСХОДНОГО ШЕЙДЕРА ---
        //   vec2 offset = iMouse / iResolution;
        //   vec3 cir = 1.0 - vec3(length(uv - offset)) - length(uv - offset);
        //   vec3 ran = vec3(fract(uv.x * 10.0));
        //   col = cir + col - ran;
        vec2 offset = uGlassCenter;

        float d = length(uv - offset);
        vec3 cir = 1.0 - vec3(d) - d;             // = 1 - 2d
        vec3 ran = vec3(fract(
          (uv.x + uGlassRanOffset.x) * uGlassScale
        + (uv.y + uGlassRanOffset.y) * uGlassScaleY
        )) * uGlassRanAmplitude;

        vec3 glassLayer = cir * uGlassStrength - ran;

        // маска: если radius <= 0 или >= 1.5 — стекло на весь экран
        float mask = 1.0;
        if (uGlassMaskRadius > 0.0001 && uGlassMaskRadius < 1.5) {
          float sm = max(uGlassMaskSoftness, 1e-4);
          mask = 1.0 - smoothstep(uGlassMaskRadius - sm, uGlassMaskRadius, d);
        }

        col = col + glassLayer * uGlassOpacity * mask;

        fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
      }

      void main() {
        vec4 color;
        vec2 fragCoord = vec2(gl_FragCoord.x, iResolution.y - gl_FragCoord.y);
        mainImage(color, fragCoord);
        gl_FragColor = color;
      }
    `;

        const compile = (type: number, src: string) => {
            const sh = gl.createShader(type);
            if (!sh) return null;
            gl.shaderSource(sh, src);
            gl.compileShader(sh);
            if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
                console.error('Shader compile error:', gl.getShaderInfoLog(sh));
                gl.deleteShader(sh);
                return null;
            }
            return sh;
        };

        const vs = compile(gl.VERTEX_SHADER, vertexSrc);
        const fs = compile(gl.FRAGMENT_SHADER, fragmentSrc);
        if (!vs || !fs) return;

        const program = gl.createProgram();
        if (!program) return;
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(program));
            return;
        }
        gl.useProgram(program);

        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
            gl.STATIC_DRAW
        );
        const posLoc = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        const U = (name: string) => gl.getUniformLocation(program, name);

        const uResolution = U('iResolution');
        const uTime = U('uTime');

        const uGradientAngle = U('uGradientAngle');
        const uGradientSoftness = U('uGradientSoftness');
        const uGradientContrast = U('uGradientContrast');
        const uGradientPivot = U('uGradientPivot');

        const uNoiseScale = U('uNoiseScale');
        const uOctave2Scale = U('uOctave2Scale');
        const uDisplaceStrength = U('uDisplaceStrength');
        const uDisplaceLayer2 = U('uDisplaceLayer2');
        const uOctaves = U('uOctaves');
        const uFbmLacunarity = U('uFbmLacunarity');
        const uFbmGain = U('uFbmGain');
        const uFbmRotation = U('uFbmRotation');
        const uNoiseOffset = U('uNoiseOffset');
        const uPhase = U('uPhase');
        const uPhase2 = U('uPhase2');

        const uStops = U('uStops');
        const uStopPos = U('uStopPos');
        const uStopCount = U('uStopCount');
        const uBrightness = U('uBrightness');
        const uSaturation = U('uSaturation');

        const uGlassCenter = U('uGlassCenter');
        const uGlassOpacity = U('uGlassOpacity');
        const uGlassStrength = U('uGlassStrength');
        const uGlassScale = U('uGlassScale');
        const uGlassScaleY = U('uGlassScaleY');
        const uGlassRanOffset = U('uGlassRanOffset');
        const uGlassRanAmplitude = U('uGlassRanAmplitude');
        const uGlassMaskRadius = U('uGlassMaskRadius');
        const uGlassMaskSoftness = U('uGlassMaskSoftness');

        // статические uniform'ы
        gl.uniform1f(uGradientAngle, gradientAngle);
        gl.uniform1f(uGradientSoftness, gradientSoftness);
        gl.uniform1f(uGradientContrast, gradientContrast);
        gl.uniform1f(uGradientPivot, gradientPivot);

        gl.uniform1f(uNoiseScale, noiseScale);
        gl.uniform1f(uOctave2Scale, octave2Scale);
        gl.uniform1f(uDisplaceStrength, displaceStrength);
        gl.uniform1f(uDisplaceLayer2, displaceLayer2);
        gl.uniform1f(uOctaves, octaves);
        gl.uniform1f(uFbmLacunarity, fbmLacunarity);
        gl.uniform1f(uFbmGain, fbmGain);
        gl.uniform1f(uFbmRotation, fbmRotation);
        gl.uniform2f(uNoiseOffset, noiseOffsetX, noiseOffsetY);

        gl.uniform1f(uBrightness, brightness);
        gl.uniform1f(uSaturation, saturation);

        gl.uniform2f(uGlassCenter, glassCenter[0], glassCenter[1]);
        gl.uniform1f(uGlassOpacity, glassOpacity);
        gl.uniform1f(uGlassStrength, glassStrength);
        gl.uniform1f(uGlassScale, glassScale);
        gl.uniform1f(uGlassScaleY, glassScaleY);
        gl.uniform2f(uGlassRanOffset, glassRanOffsetX, glassRanOffsetY);
        gl.uniform1f(uGlassRanAmplitude, glassRanAmplitude);
        gl.uniform1f(uGlassMaskRadius, glassMaskRadius);
        gl.uniform1f(uGlassMaskSoftness, glassMaskSoftness);

        const flatStops = new Float32Array(stopsArray.flat());
        const flatPos = new Float32Array(positionsArray);
        gl.uniform3fv(uStops, flatStops);
        gl.uniform1fv(uStopPos, flatPos);
        gl.uniform1i(uStopCount, stopCount);

        const render = () => {
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            const w = Math.max(1, Math.floor(rect.width * dpr));
            const h = Math.max(1, Math.floor(rect.height * dpr));
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w;
                canvas.height = h;
            }
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.uniform2f(uResolution, canvas.width, canvas.height);

            const now = performance.now();
            const t = paused
                ? pausedTimeRef.current
                : (now - startTimeRef.current) / 1000;
            if (!paused) pausedTimeRef.current = t;

            gl.uniform1f(uTime, t);
            gl.uniform1f(uPhase, phaseOffset + t * phaseSpeed);
            gl.uniform1f(uPhase2, t * phaseSpeed * phaseSpeed2);

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            rafRef.current = requestAnimationFrame(render);
        };
        render();

        return () => {
            cancelAnimationFrame(rafRef.current);
            gl.deleteProgram(program);
            gl.deleteShader(vs);
            gl.deleteShader(fs);
            gl.deleteBuffer(buf);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        gradientAngle,
        gradientSoftness,
        gradientContrast,
        gradientPivot,
        noiseScale,
        octave2Scale,
        displaceStrength,
        displaceLayer2,
        octaves,
        fbmLacunarity,
        fbmGain,
        fbmRotation,
        noiseOffsetX,
        noiseOffsetY,
        phaseSpeed,
        phaseSpeed2,
        phaseOffset,
        brightness,
        saturation,
        glassCenter[0],
        glassCenter[1],
        glassOpacity,
        glassStrength,
        glassScale,
        glassScaleY,
        glassRanOffsetX,
        glassRanOffsetY,
        glassRanAmplitude,
        glassMaskRadius,
        glassMaskSoftness,
        paused,
        JSON.stringify(colorStops),
    ]);

    return (
        <canvas
            ref={canvasRef}
            className={className}
            style={{ display: 'block', width, height, ...style }}
        />
    );
};