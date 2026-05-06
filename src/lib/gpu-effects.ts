/**
 * WebGPU Effects Engine for Icon Generator
 * Handles procedural backgrounds, logo materials, and post-processing via GPU shaders.
 * Falls back to null if WebGPU is unavailable.
 */

// ── Shared WGSL utilities ──
const WGSL_UTILS = /* wgsl */`
// Hash functions for noise
fn hash21(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 = p3 + dot(p3, vec3f(p3.y + 33.33, p3.z + 33.33, p3.x + 33.33));
  return fract((p3.x + p3.y) * p3.z);
}

fn hash22(p: vec2f) -> vec2f {
  let n = sin(dot(p, vec2f(41.0, 289.0)));
  return fract(vec2f(262144.0, 32768.0) * n);
}

// Smooth noise
fn noise2d(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2f(1.0, 0.0)), u.x),
    mix(hash21(i + vec2f(0.0, 1.0)), hash21(i + vec2f(1.0, 1.0)), u.x),
    u.y
  );
}

// Fractal Brownian Motion
fn fbm(p: vec2f, octaves: i32) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var frequency = 1.0;
  var pos = p;
  for (var i = 0; i < octaves; i = i + 1) {
    value = value + amplitude * noise2d(pos * frequency);
    frequency = frequency * 2.0;
    amplitude = amplitude * 0.5;
  }
  return value;
}

// Voronoi distance
fn voronoi(p: vec2f) -> vec2f {
  let n = floor(p);
  let f = fract(p);
  var md = 8.0;
  var md2 = 8.0;
  for (var j = -1; j <= 1; j = j + 1) {
    for (var i = -1; i <= 1; i = i + 1) {
      let g = vec2f(f32(i), f32(j));
      let o = hash22(n + g);
      let r = g + o - f;
      let d = dot(r, r);
      if (d < md) {
        md2 = md;
        md = d;
      } else if (d < md2) {
        md2 = d;
      }
    }
  }
  return vec2f(sqrt(md), sqrt(md2));
}

// SDF circle
fn sdCircle(p: vec2f, r: f32) -> f32 {
  return length(p) - r;
}

// SDF rounded box
fn sdRoundBox(p: vec2f, b: vec2f, r: f32) -> f32 {
  let q = abs(p) - b + vec2f(r);
  return length(max(q, vec2f(0.0))) + min(max(q.x, q.y), 0.0) - r;
}

// HSV to RGB
fn hsv2rgb(c: vec3f) -> vec3f {
  let p = abs(fract(vec3f(c.x) + vec3f(1.0, 2.0/3.0, 1.0/3.0)) * 6.0 - vec3f(3.0));
  return c.z * mix(vec3f(1.0), clamp(p - vec3f(1.0), vec3f(0.0), vec3f(1.0)), c.y);
}
`;

// ── Background shader: Plasma ──
const SHADER_BG_PLASMA = /* wgsl */`
${WGSL_UTILS}

struct Uniforms {
  time: f32,
  scale: f32,
  color1: vec4f,
  color2: vec4f,
  color3: vec4f,
}

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex fn vs(@builtin(vertex_index) i: u32) -> VertexOutput {
  let pos = array<vec2f, 6>(
    vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
    vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
  );
  var out: VertexOutput;
  out.position = vec4f(pos[i], 0.0, 1.0);
  out.uv = pos[i] * 0.5 + 0.5;
  return out;
}

@fragment fn fs(in: VertexOutput) -> @location(0) vec4f {
  let uv = in.uv * u.scale;
  let t = u.time;

  var v = 0.0;
  v += sin(uv.x * 3.0 + t);
  v += sin((uv.y * 3.0 + t) * 0.7);
  v += sin((uv.x * 3.0 + uv.y * 3.0 + t) * 0.5);
  v += sin(length(uv * 4.0 - vec2f(2.0)) * 2.0 + t * 0.8);
  v = v * 0.25 + 0.5;

  let n = fbm(uv * 3.0 + vec2f(t * 0.1), 4);
  v = mix(v, n, 0.3);

  let c1 = u.color1.rgb;
  let c2 = u.color2.rgb;
  let c3 = u.color3.rgb;

  var col = mix(c1, c2, smoothstep(0.2, 0.5, v));
  col = mix(col, c3, smoothstep(0.5, 0.8, v));

  return vec4f(col, 1.0);
}
`;

// ── Background shader: Voronoi Crystal ──
const SHADER_BG_VORONOI = /* wgsl */`
${WGSL_UTILS}

struct Uniforms {
  time: f32,
  scale: f32,
  color1: vec4f,
  color2: vec4f,
  color3: vec4f,
}

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex fn vs(@builtin(vertex_index) i: u32) -> VertexOutput {
  let pos = array<vec2f, 6>(
    vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
    vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
  );
  var out: VertexOutput;
  out.position = vec4f(pos[i], 0.0, 1.0);
  out.uv = pos[i] * 0.5 + 0.5;
  return out;
}

@fragment fn fs(in: VertexOutput) -> @location(0) vec4f {
  let uv = in.uv * u.scale;
  let v = voronoi(uv * 5.0 + vec2f(u.time * 0.05));

  let edge = smoothstep(0.0, 0.05, v.y - v.x);
  let cell = v.x;

  let c1 = u.color1.rgb;
  let c2 = u.color2.rgb;
  let c3 = u.color3.rgb;

  var col = mix(c1, c2, cell);
  col = mix(c3, col, edge);

  // Add subtle glow at edges
  col += c3 * (1.0 - edge) * 0.5;

  return vec4f(col, 1.0);
}
`;

// ── Background shader: Aurora ──
const SHADER_BG_AURORA = /* wgsl */`
${WGSL_UTILS}

struct Uniforms {
  time: f32,
  scale: f32,
  color1: vec4f,
  color2: vec4f,
  color3: vec4f,
}

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex fn vs(@builtin(vertex_index) i: u32) -> VertexOutput {
  let pos = array<vec2f, 6>(
    vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
    vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
  );
  var out: VertexOutput;
  out.position = vec4f(pos[i], 0.0, 1.0);
  out.uv = pos[i] * 0.5 + 0.5;
  return out;
}

@fragment fn fs(in: VertexOutput) -> @location(0) vec4f {
  let uv = in.uv;
  let t = u.time * 0.3;

  // Multiple layered aurora bands
  var aurora = 0.0;
  for (var i = 0; i < 5; i = i + 1) {
    let fi = f32(i);
    let y_offset = 0.3 + fi * 0.12;
    let wave = sin(uv.x * (3.0 + fi) + t + fi * 1.5) * 0.08;
    let wave2 = sin(uv.x * (7.0 + fi * 2.0) - t * 0.7 + fi) * 0.04;
    let band_y = y_offset + wave + wave2;
    let dist = abs(uv.y - band_y);
    let intensity = exp(-dist * (15.0 - fi * 2.0));
    aurora += intensity * (1.0 - fi * 0.15);
  }

  // Noise modulation
  let n = fbm(vec2f(uv.x * 4.0 + t * 0.2, uv.y * 2.0), 4);
  aurora *= 0.7 + n * 0.6;

  let c1 = u.color1.rgb;
  let c2 = u.color2.rgb;
  let c3 = u.color3.rgb;

  // Dark base
  var col = c3 * 0.1;
  // Aurora color mix
  let auroraColor = mix(c1, c2, sin(uv.x * 3.0 + t) * 0.5 + 0.5);
  col += auroraColor * aurora;
  // Add slight stars
  let star = step(0.998, hash21(floor(uv * 200.0)));
  col += vec3f(star) * 0.6;

  return vec4f(col, 1.0);
}
`;

// ── Background shader: Nebula/Galaxy ──
const SHADER_BG_NEBULA = /* wgsl */`
${WGSL_UTILS}

struct Uniforms {
  time: f32,
  scale: f32,
  color1: vec4f,
  color2: vec4f,
  color3: vec4f,
}

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex fn vs(@builtin(vertex_index) i: u32) -> VertexOutput {
  let pos = array<vec2f, 6>(
    vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
    vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
  );
  var out: VertexOutput;
  out.position = vec4f(pos[i], 0.0, 1.0);
  out.uv = pos[i] * 0.5 + 0.5;
  return out;
}

@fragment fn fs(in: VertexOutput) -> @location(0) vec4f {
  let uv = in.uv;
  let t = u.time * 0.1;

  // Swirling nebula
  let center = vec2f(0.5, 0.5);
  let d = uv - center;
  let angle = atan2(d.y, d.x);
  let dist = length(d);

  let spiral = angle + dist * 5.0 + t;
  let n1 = fbm(vec2f(cos(spiral) * dist * 3.0, sin(spiral) * dist * 3.0) + vec2f(t), 5);
  let n2 = fbm(uv * 4.0 + vec2f(t * 0.5, -t * 0.3), 4);

  let c1 = u.color1.rgb;
  let c2 = u.color2.rgb;
  let c3 = u.color3.rgb;

  // Deep space base
  var col = c3 * 0.05;
  // Nebula clouds
  col += c1 * n1 * 0.8 * smoothstep(0.6, 0.0, dist);
  col += c2 * n2 * 0.5 * smoothstep(0.5, 0.1, dist);
  // Star field
  let starUv = floor(uv * 150.0);
  let starRand = hash21(starUv);
  let star = smoothstep(0.97, 1.0, starRand) * smoothstep(0.0, 0.3, noise2d(starUv * 0.1 + vec2f(t)));
  col += vec3f(star) * (0.5 + starRand * 0.5);
  // Bright core
  col += c1 * 0.3 * exp(-dist * 6.0);

  return vec4f(col, 1.0);
}
`;

// ── Post-processing: Bloom ──
const SHADER_BLOOM = /* wgsl */`
struct Uniforms {
  texelSize: vec2f,
  direction: vec2f,
  intensity: f32,
  threshold: f32,
  _pad: vec2f,
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var inputSampler: sampler;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex fn vs(@builtin(vertex_index) i: u32) -> VertexOutput {
  let pos = array<vec2f, 6>(
    vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
    vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
  );
  var out: VertexOutput;
  out.position = vec4f(pos[i], 0.0, 1.0);
  out.uv = pos[i] * 0.5 + 0.5;
  return out;
}

@fragment fn fs(in: VertexOutput) -> @location(0) vec4f {
  // Gaussian weights for 9-tap blur
  let weights = array<f32, 5>(0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);

  var result = textureSample(inputTex, inputSampler, in.uv) * weights[0];

  for (var i = 1; i < 5; i = i + 1) {
    let offset = u.direction * u.texelSize * f32(i) * 2.0;
    result += textureSample(inputTex, inputSampler, in.uv + offset) * weights[i];
    result += textureSample(inputTex, inputSampler, in.uv - offset) * weights[i];
  }

  return result * u.intensity;
}
`;

// ── Post-processing: Chromatic Aberration + Vignette ──
const SHADER_POST_FINAL = /* wgsl */`
struct Uniforms {
  chromaticStrength: f32,
  vignetteStrength: f32,
  vignetteRadius: f32,
  _pad: f32,
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var bloomTex: texture_2d<f32>;
@group(0) @binding(3) var inputSampler: sampler;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex fn vs(@builtin(vertex_index) i: u32) -> VertexOutput {
  let pos = array<vec2f, 6>(
    vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
    vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
  );
  var out: VertexOutput;
  out.position = vec4f(pos[i], 0.0, 1.0);
  out.uv = pos[i] * 0.5 + 0.5;
  return out;
}

@fragment fn fs(in: VertexOutput) -> @location(0) vec4f {
  let uv = in.uv;
  let center = vec2f(0.5);
  let d = uv - center;
  let dist = length(d);

  // Chromatic aberration
  let offset = d * dist * u.chromaticStrength;
  let r = textureSample(inputTex, inputSampler, uv + offset).r;
  let g = textureSample(inputTex, inputSampler, uv).g;
  let b = textureSample(inputTex, inputSampler, uv - offset).b;
  var col = vec3f(r, g, b);

  // Add bloom
  let bloom = textureSample(bloomTex, inputSampler, uv).rgb;
  col += bloom;

  // Vignette
  let vignette = 1.0 - smoothstep(u.vignetteRadius, u.vignetteRadius + u.vignetteStrength, dist);
  col *= vignette;

  return vec4f(col, 1.0);
}
`;

// ── Logo material: Iridescent/Holographic ──
const SHADER_LOGO_IRIDESCENT = /* wgsl */`
${WGSL_UTILS}

struct Uniforms {
  time: f32,
  intensity: f32,
  baseColor: vec4f,
  _pad: vec2f,
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var maskTex: texture_2d<f32>;
@group(0) @binding(2) var maskSampler: sampler;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex fn vs(@builtin(vertex_index) i: u32) -> VertexOutput {
  let pos = array<vec2f, 6>(
    vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
    vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
  );
  var out: VertexOutput;
  out.position = vec4f(pos[i], 0.0, 1.0);
  out.uv = pos[i] * 0.5 + 0.5;
  return out;
}

@fragment fn fs(in: VertexOutput) -> @location(0) vec4f {
  let uv = in.uv;
  let mask = textureSample(maskTex, maskSampler, uv).a;
  if (mask < 0.01) { discard; }

  let t = u.time;

  // Iridescent color shift based on position and "viewing angle" simulation
  let angle = atan2(uv.y - 0.5, uv.x - 0.5);
  let dist = length(uv - vec2f(0.5));

  // Thin-film interference simulation
  let phase = angle * 2.0 + dist * 8.0 + t * 0.5;
  let hue = fract(phase / (2.0 * 3.14159));
  let rainbow = hsv2rgb(vec3f(hue, 0.8, 1.0));

  // Noise for organic feel
  let n = fbm(uv * 6.0 + vec2f(t * 0.1), 3);

  // Mix base color with iridescence
  var col = mix(u.baseColor.rgb, rainbow, u.intensity * (0.6 + n * 0.4));

  // Fresnel-like edge brightening
  let fresnel = pow(1.0 - abs(dist - 0.25) * 4.0, 2.0);
  col += vec3f(fresnel * 0.3);

  return vec4f(col, mask);
}
`;

// ── GPU Effect Engine class ──
export type GpuBgEffect = 'plasma' | 'voronoi' | 'aurora' | 'nebula';
export type GpuPostEffect = 'bloom' | 'chromatic' | 'none';

export interface GpuEffectParams {
  bgEffect?: GpuBgEffect;
  bgColors: [string, string, string];
  bgScale?: number;
  bgTime?: number;
  postEffect?: GpuPostEffect;
  bloomIntensity?: number;
  bloomThreshold?: number;
  chromaticStrength?: number;
  vignetteStrength?: number;
}

function hexToVec4(hex: string): Float32Array {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return new Float32Array([r, g, b, 1.0]);
}

export class GpuEffectEngine {
  private device: GPUDevice;
  private bgPipelines: Map<GpuBgEffect, GPURenderPipeline> = new Map();
  private bloomPipeline: GPURenderPipeline | null = null;
  private postPipeline: GPURenderPipeline | null = null;
  private sampler: GPUSampler;

  private constructor(device: GPUDevice) {
    this.device = device;
    this.sampler = device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
    });
  }

  static async create(): Promise<GpuEffectEngine | null> {
    if (!navigator.gpu) return null;
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) return null;
      const device = await adapter.requestDevice();
      const engine = new GpuEffectEngine(device);
      engine.initPipelines();
      return engine;
    } catch {
      return null;
    }
  }

  private initPipelines() {
    const bgShaders: Record<GpuBgEffect, string> = {
      plasma: SHADER_BG_PLASMA,
      voronoi: SHADER_BG_VORONOI,
      aurora: SHADER_BG_AURORA,
      nebula: SHADER_BG_NEBULA,
    };

    for (const [name, code] of Object.entries(bgShaders)) {
      const module = this.device.createShaderModule({ code });
      const pipeline = this.device.createRenderPipeline({
        layout: 'auto',
        vertex: { module, entryPoint: 'vs' },
        fragment: {
          module,
          entryPoint: 'fs',
          targets: [{ format: 'rgba8unorm' }],
        },
        primitive: { topology: 'triangle-list' },
      });
      this.bgPipelines.set(name as GpuBgEffect, pipeline);
    }

    // Bloom pipeline
    const bloomModule = this.device.createShaderModule({ code: SHADER_BLOOM });
    this.bloomPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: bloomModule, entryPoint: 'vs' },
      fragment: {
        module: bloomModule,
        entryPoint: 'fs',
        targets: [{ format: 'rgba8unorm' }],
      },
      primitive: { topology: 'triangle-list' },
    });

    // Post-process pipeline
    const postModule = this.device.createShaderModule({ code: SHADER_POST_FINAL });
    this.postPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: postModule, entryPoint: 'vs' },
      fragment: {
        module: postModule,
        entryPoint: 'fs',
        targets: [{ format: 'rgba8unorm' }],
      },
      primitive: { topology: 'triangle-list' },
    });
  }

  /**
   * Render a procedural background to a canvas
   */
  async renderBackground(
    effect: GpuBgEffect,
    size: number,
    colors: [string, string, string],
    time: number = 0,
    scale: number = 1.0
  ): Promise<ImageBitmap> {
    const pipeline = this.bgPipelines.get(effect);
    if (!pipeline) throw new Error(`Unknown bg effect: ${effect}`);

    const texture = this.device.createTexture({
      size: [size, size],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
    });

    // Uniform buffer: time, scale, color1(vec4), color2(vec4), color3(vec4)
    const uniformData = new Float32Array(16);
    uniformData[0] = time;
    uniformData[1] = scale;
    uniformData.set(hexToVec4(colors[0]), 4);  // offset 16 bytes (vec4 alignment)
    uniformData.set(hexToVec4(colors[1]), 8);
    uniformData.set(hexToVec4(colors[2]), 12);

    const uniformBuffer = this.device.createBuffer({
      size: uniformData.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(uniformBuffer, 0, uniformData);

    const bindGroup = this.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
    });

    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: texture.createView(),
        loadOp: 'clear',
        storeOp: 'store',
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
      }],
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(6);
    pass.end();

    // Copy to buffer for readback
    const bytesPerRow = Math.ceil(size * 4 / 256) * 256;
    const readBuffer = this.device.createBuffer({
      size: bytesPerRow * size,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    encoder.copyTextureToBuffer(
      { texture },
      { buffer: readBuffer, bytesPerRow },
      [size, size]
    );

    this.device.queue.submit([encoder.finish()]);
    await this.device.queue.onSubmittedWorkDone();
    await readBuffer.mapAsync(GPUMapMode.READ);

    const data = new Uint8Array(readBuffer.getMappedRange());
    // Convert to ImageData-compatible format (handle bytesPerRow padding)
    const pixels = new Uint8ClampedArray(size * size * 4);
    for (let y = 0; y < size; y++) {
      const srcOffset = y * bytesPerRow;
      const dstOffset = y * size * 4;
      pixels.set(data.subarray(srcOffset, srcOffset + size * 4), dstOffset);
    }

    readBuffer.unmap();
    readBuffer.destroy();
    texture.destroy();
    uniformBuffer.destroy();

    const imageData = new ImageData(pixels, size, size);
    return createImageBitmap(imageData);
  }

  /**
   * Apply bloom post-processing to a canvas
   */
  async applyBloom(
    sourceCanvas: HTMLCanvasElement | OffscreenCanvas,
    intensity: number = 1.5,
    _threshold: number = 0.6
  ): Promise<ImageBitmap> {
    if (!this.bloomPipeline) throw new Error('Bloom pipeline not initialized');

    const size = sourceCanvas.width;
    const sourceBitmap = await createImageBitmap(sourceCanvas);

    const sourceTexture = this.device.createTexture({
      size: [size, size],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.device.queue.copyExternalImageToTexture(
      { source: sourceBitmap },
      { texture: sourceTexture },
      [size, size]
    );

    // Horizontal pass
    const hTexture = this.device.createTexture({
      size: [size, size],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC,
    });

    const texelSize = 1.0 / size;
    const hUniformData = new Float32Array(8);
    hUniformData[0] = texelSize; hUniformData[1] = texelSize; // texelSize
    hUniformData[2] = 1.0; hUniformData[3] = 0.0; // direction (horizontal)
    hUniformData[4] = intensity; // intensity
    hUniformData[5] = _threshold; // threshold

    const hUniformBuffer = this.device.createBuffer({
      size: hUniformData.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(hUniformBuffer, 0, hUniformData);

    const hBindGroup = this.device.createBindGroup({
      layout: this.bloomPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: hUniformBuffer } },
        { binding: 1, resource: sourceTexture.createView() },
        { binding: 2, resource: this.sampler },
      ],
    });

    const encoder = this.device.createCommandEncoder();

    // Horizontal blur pass
    const hPass = encoder.beginRenderPass({
      colorAttachments: [{
        view: hTexture.createView(),
        loadOp: 'clear',
        storeOp: 'store',
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
      }],
    });
    hPass.setPipeline(this.bloomPipeline);
    hPass.setBindGroup(0, hBindGroup);
    hPass.draw(6);
    hPass.end();

    // Vertical pass
    const vTexture = this.device.createTexture({
      size: [size, size],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
    });

    const vUniformData = new Float32Array(8);
    vUniformData[0] = texelSize; vUniformData[1] = texelSize;
    vUniformData[2] = 0.0; vUniformData[3] = 1.0; // direction (vertical)
    vUniformData[4] = intensity;
    vUniformData[5] = _threshold;

    const vUniformBuffer = this.device.createBuffer({
      size: vUniformData.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(vUniformBuffer, 0, vUniformData);

    const vBindGroup = this.device.createBindGroup({
      layout: this.bloomPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: vUniformBuffer } },
        { binding: 1, resource: hTexture.createView() },
        { binding: 2, resource: this.sampler },
      ],
    });

    const vPass = encoder.beginRenderPass({
      colorAttachments: [{
        view: vTexture.createView(),
        loadOp: 'clear',
        storeOp: 'store',
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
      }],
    });
    vPass.setPipeline(this.bloomPipeline);
    vPass.setBindGroup(0, vBindGroup);
    vPass.draw(6);
    vPass.end();

    // Readback
    const bytesPerRow = Math.ceil(size * 4 / 256) * 256;
    const readBuffer = this.device.createBuffer({
      size: bytesPerRow * size,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    encoder.copyTextureToBuffer(
      { texture: vTexture },
      { buffer: readBuffer, bytesPerRow },
      [size, size]
    );

    this.device.queue.submit([encoder.finish()]);
    await this.device.queue.onSubmittedWorkDone();
    await readBuffer.mapAsync(GPUMapMode.READ);

    const data = new Uint8Array(readBuffer.getMappedRange());
    const pixels = new Uint8ClampedArray(size * size * 4);
    for (let y = 0; y < size; y++) {
      pixels.set(data.subarray(y * bytesPerRow, y * bytesPerRow + size * 4), y * size * 4);
    }

    readBuffer.unmap();

    // Cleanup
    readBuffer.destroy();
    sourceTexture.destroy();
    hTexture.destroy();
    vTexture.destroy();
    hUniformBuffer.destroy();
    vUniformBuffer.destroy();

    const imageData = new ImageData(pixels, size, size);
    return createImageBitmap(imageData);
  }

  destroy() {
    this.device.destroy();
  }
}
