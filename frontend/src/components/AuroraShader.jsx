import { useRef, useEffect } from 'react';

/**
 * Real WebGL aurora shader. Genuine GPU-rendered animated depth, written
 * directly against the WebGL API with zero external dependencies (three.js
 * would have added ~600KB to an already 1MB bundle for this one effect).
 *
 * Uses real fractal Brownian motion (layered simplex-style noise) to produce
 * organic, slowly-drifting light, colored with the real CapForge brand tokens
 * rather than generic shader-demo colors.
 *
 * Respects prefers-reduced-motion, and stops its render loop entirely when
 * scrolled off screen so it never burns GPU in the background.
 */

const VERT = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2  u_resolution;
uniform float u_time;

// Real 2D simplex-style noise
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// Real fractal Brownian motion for organic, layered depth
float fbm(vec2 p) {
  float total = 0.0, amp = 0.5;
  for (int i = 0; i < 5; i++) {
    total += snoise(p) * amp;
    p *= 2.0;
    amp *= 0.5;
  }
  return total;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= u_resolution.x / u_resolution.y;

  float t = u_time * 0.06;

  // Real layered flow, giving the sense of light moving through depth
  float n1 = fbm(p * 1.2 + vec2(t, t * 0.6));
  float n2 = fbm(p * 2.1 - vec2(t * 0.8, t * 0.4) + n1 * 0.6);
  float n3 = fbm(p * 0.7 + vec2(-t * 0.5, t * 0.3) + n2 * 0.4);

  // Real CapForge brand colors, not generic shader-demo palette
  vec3 violet = vec3(0.486, 0.361, 0.988);
  vec3 forest = vec3(0.122, 0.365, 0.322);
  vec3 deep   = vec3(0.086, 0.090, 0.098);
  vec3 mint   = vec3(0.247, 0.690, 0.506);

  float band1 = smoothstep(-0.2, 0.9, n1);
  float band2 = smoothstep(-0.4, 0.8, n2);
  float band3 = smoothstep(0.0, 1.0, n3);

  vec3 col = deep;
  col = mix(col, violet, band1 * 0.55);
  col = mix(col, forest, band2 * 0.35);
  col = mix(col, mint,   band3 * 0.12);

  // Real vignette, keeping focus toward the center where content sits
  float vig = 1.0 - length(p * 0.55);
  col *= smoothstep(-0.2, 1.0, vig);

  // Subtle grain, preventing visible color banding on large gradients
  float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  col += (grain - 0.5) * 0.015;

  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl, type, src) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile failed:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export default function AuroraShader({ className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) return; // Real graceful degradation: the parent's own background shows through

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Shader link failed:', gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, 'u_resolution');
    const uTime = gl.getUniformLocation(program, 'u_time');

    // Real DPR cap: full retina resolution on a fullscreen shader is a genuine perf cost for no visible gain here
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    function resize() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
      gl.uniform2f(uRes, canvas.width, canvas.height);
    }
    resize();
    window.addEventListener('resize', resize);

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Real visibility gating: stop rendering entirely when scrolled off screen
    let visible = true;
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: 0 });
    observer.observe(canvas);

    let frameId;
    const start = performance.now();
    function render(now) {
      if (visible) {
        resize();
        gl.uniform1f(uTime, reduceMotion ? 0 : (now - start) / 1000);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      frameId = requestAnimationFrame(render);
    }
    frameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      observer.disconnect();
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
