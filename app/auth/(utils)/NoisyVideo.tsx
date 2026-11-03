'use client';

import { useEffect, useRef } from 'react';

type NoisyVideoGLProps = {
    src: string;
    grainAmount?: number;   // 0.0 – 1.0
    grainSize?: number;     // 1.0 – 4.0
    grainSpeed?: number;    // кадров/сек
    className?: string;
    width?: number | string;
    height?: number | string;
};

const VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;

  uniform sampler2D u_texture;
  uniform vec2 u_resolution;
  uniform float u_grainAmount;
  uniform float u_grainSize;
  uniform float u_frame;

  varying vec2 v_texCoord;

  // ===== 3D Simplex Noise (Ashima Arts / Stefan Gustavson, MIT) =====
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  // ===== Film Grain (по мотивам glsl-film-grain) =====
  float grain(vec2 texCoord, vec2 resolution, float frame, float multiplier) {
    vec2 mult = texCoord * resolution;
    float offset = snoise(vec3(mult / multiplier, frame));
    // Второй проход — для текстуры, можно упростить до одного snoise
    float n1 = snoise(vec3(mult, offset + frame));
    return n1 / 2.0 + 0.5;
  }

  // ===== Soft Light Blend =====
  vec3 blendSoftLight(vec3 base, vec3 blend) {
    return mix(
      sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend),
      2.0 * base * blend + base * base * (1.0 - 2.0 * blend),
      step(base, vec3(0.5))
    );
  }

  float luma(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
  }

  void main() {
    vec2 uv = v_texCoord;
    vec3 backgroundColor = texture2D(u_texture, uv).rgb;

    float g = grain(uv, u_resolution / u_grainSize, u_frame, 1.0);
    vec3 grainColor = vec3(g);

    vec3 color = blendSoftLight(backgroundColor, grainColor);

    float luminance = luma(backgroundColor);
    float response = smoothstep(0.05, 0.5, luminance);
    color = mix(color, backgroundColor, pow(response, 2.0) * (1.0 - u_grainAmount));

    color = mix(backgroundColor, color, u_grainAmount);

    gl_FragColor = vec4(color, 1.0);
  }
`;

export default function NoisyVideo({
                                         src,
                                         grainAmount = 0.25,
                                         grainSize = 2.0,
                                         grainSpeed = 24,
                                         className,
                                         width = '100%',
                                         height = 'auto',
                                     }: NoisyVideoGLProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        const gl = canvas.getContext('webgl', { alpha: false, antialias: false });
        if (!gl) {
            console.warn('WebGL не поддерживается');
            return;
        }

        const compileShader = (type: number, source: string) => {
            const shader = gl.createShader(type)!;
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error(gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }
            return shader;
        };

        const vert = compileShader(gl.VERTEX_SHADER, VERTEX_SHADER);
        const frag = compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
        if (!vert || !frag) return;

        const program = gl.createProgram()!;
        gl.attachShader(program, vert);
        gl.attachShader(program, frag);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error(gl.getProgramInfoLog(program));
            return;
        }

        gl.useProgram(program);

        const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
        const texCoords = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]);

        const posBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
        const aPosition = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(aPosition);
        gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

        const texBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
        const aTexCoord = gl.getAttribLocation(program, 'a_texCoord');
        gl.enableVertexAttribArray(aTexCoord);
        gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);

        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

        const uTexture = gl.getUniformLocation(program, 'u_texture');
        const uResolution = gl.getUniformLocation(program, 'u_resolution');
        const uGrainAmount = gl.getUniformLocation(program, 'u_grainAmount');
        const uGrainSize = gl.getUniformLocation(program, 'u_grainSize');
        const uFrame = gl.getUniformLocation(program, 'u_frame');

        video.muted = true;
        video.play().catch(() => {});

        let stopped = false;
        let grainFrame = 0;
        let lastGrainUpdate = 0;

        const render = (now: number) => {
            if (stopped) return;

            if (grainSpeed > 0) {
                const interval = 1000 / grainSpeed;
                if (now - lastGrainUpdate >= interval) {
                    grainFrame += 1;
                    lastGrainUpdate = now;
                }
            }

            if (video.readyState >= 2 && video.videoWidth > 0) {
                if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    gl.viewport(0, 0, canvas.width, canvas.height);
                }

                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);

                gl.uniform1i(uTexture, 0);
                gl.uniform2f(uResolution, canvas.width, canvas.height);
                gl.uniform1f(uGrainAmount, grainAmount);
                gl.uniform1f(uGrainSize, grainSize);
                gl.uniform1f(uFrame, grainFrame);

                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            }

            rafRef.current = requestAnimationFrame(render);
        };

        rafRef.current = requestAnimationFrame(render);

        return () => {
            stopped = true;
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
            gl.deleteTexture(texture);
            gl.deleteBuffer(posBuffer);
            gl.deleteBuffer(texBuffer);
            gl.deleteProgram(program);
            gl.deleteShader(vert);
            gl.deleteShader(frag);
        };
    }, [src, grainAmount, grainSize, grainSpeed]);

    return (
        <div className={className} style={{ position: 'relative', width, height, overflow: 'hidden' }}>
            <video
                ref={videoRef}
                src={src}
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                style={{ display: 'none' }}
            />
            <canvas
                ref={canvasRef}
                style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
            />
        </div>
    );
}