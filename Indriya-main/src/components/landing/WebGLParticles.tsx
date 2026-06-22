"use client";

import { useEffect, useRef } from "react";

const vertexShaderSource = `
  attribute vec2 aSeed;
  uniform float uTime;
  uniform vec2 uResolution;
  varying float vDepth;

  void main() {
    // gentle lateral sway + slow upward drift
    float drift = sin(uTime * 0.18 + aSeed.x * 17.0) * 0.04
                + cos(uTime * 0.11 + aSeed.y * 9.0) * 0.018;
    float rise = fract(aSeed.y + uTime * (0.006 + aSeed.x * 0.011));
    vec2 pos = vec2(aSeed.x * 2.0 - 1.0 + drift, rise * 2.0 - 1.0);
    float edgeFade = 1.0 - smoothstep(0.76, 1.0, abs(pos.x));
    vDepth = edgeFade * (0.32 + aSeed.y * 0.68);

    gl_Position = vec4(pos, 0.0, 1.0);
    gl_PointSize = (1.4 + aSeed.x * 3.4) * min(uResolution.x / 1200.0, 1.4);
  }
`;

const fragmentShaderSource = `
  precision mediump float;
  varying float vDepth;

  void main() {
    vec2 p = gl_PointCoord - vec2(0.5);
    float d = length(p);
    // soft round dust mote
    float core = smoothstep(0.5, 0.05, d);
    // icy palette: deep cornflower (far) -> frost blue (near), against white
    vec3 color = mix(vec3(0.16, 0.40, 0.66), vec3(0.55, 0.74, 0.90), vDepth);
    float alpha = core * (0.10 + vDepth * 0.42);
    gl_FragColor = vec4(color, alpha);
  }
`;

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function WebGLParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl", {
      alpha: true,
      antialias: true,
      depth: false,
    });
    if (!canvas) return;
    if (!gl) return;

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = compileShader(
      gl,
      gl.FRAGMENT_SHADER,
      fragmentShaderSource
    );
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

    const seeds = new Float32Array(560 * 2);
    for (let i = 0; i < seeds.length; i += 2) {
      seeds[i] = Math.random();
      seeds[i + 1] = Math.random();
    }

    const buffer = gl.createBuffer();
    const seedLocation = gl.getAttribLocation(program, "aSeed");
    const timeLocation = gl.getUniformLocation(program, "uTime");
    const resolutionLocation = gl.getUniformLocation(program, "uResolution");

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
    gl.enable(gl.BLEND);
    // normal alpha blending so the icy-blue motes read against the white page
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Alias the (now non-null) canvas + context into consts so the render/
    // resize closures keep the narrowed, non-null types.
    const cv = canvas;
    const ctx = gl;
    let frame = 0;
    let start = performance.now();

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.floor(cv.clientWidth * ratio));
      const height = Math.max(1, Math.floor(cv.clientHeight * ratio));
      if (cv.width !== width || cv.height !== height) {
        cv.width = width;
        cv.height = height;
      }
      ctx.viewport(0, 0, width, height);
    }

    function render(now: number) {
      resize();
      ctx.clearColor(0, 0, 0, 0);
      ctx.clear(ctx.COLOR_BUFFER_BIT);
      ctx.useProgram(program);
      ctx.bindBuffer(ctx.ARRAY_BUFFER, buffer);
      ctx.vertexAttribPointer(seedLocation, 2, ctx.FLOAT, false, 0, 0);
      ctx.enableVertexAttribArray(seedLocation);
      ctx.uniform1f(timeLocation, (now - start) / 1000);
      ctx.uniform2f(resolutionLocation, cv.width, cv.height);
      ctx.drawArrays(ctx.POINTS, 0, seeds.length / 2);
      frame = requestAnimationFrame(render);
    }

    frame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frame);
      ctx.deleteBuffer(buffer);
      ctx.deleteProgram(program);
      ctx.deleteShader(vertexShader);
      ctx.deleteShader(fragmentShader);
      start = 0;
    };
  }, []);

  return <canvas ref={canvasRef} className="landing-particles" aria-hidden />;
}
