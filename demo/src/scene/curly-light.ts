/* eslint-disable max-len */
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Timer,
  Vector2,
  Vector3,
  Color,
  Fog,
  AmbientLight,
  SRGBColorSpace,
  ACESFilmicToneMapping,
  BasicShadowMap,
  PointLight,
  DirectionalLight,
  Points,
  Ray,
  BufferAttribute,
  RawShaderMaterial,
  BackSide,
  NoBlending,
  PlaneGeometry,
  MeshStandardMaterial,
  Mesh,
  ShaderMaterial,
  BufferGeometry
} from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

import { GPUComputationRenderer } from "./gpu-computation-renderer";

import "../style.scss";

/** plain 0..1 color the panel passes to the scene setters */
export interface RGB {
  r: number;
  g: number;
  b: number;
}

interface AppState {
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  composer: EffectComposer;
  timer: Timer;
  particles: Points | null;
  mousePosition: Vector2;
  mouse3d: Vector3;
  ray: Ray;
  isMouseInWindow: boolean;
  gpuCompute: GPUComputationRenderer | null;
  positionVariable: any;
  velocityVariable: any;
  particleSize: number;
  particleCount: number;
  mouseRef: { x: number; y: number; focus: boolean; targetX: number; targetY: number };
}

/**
 * the demo's three.js scene: a GPU-driven curl-noise particle system with bloom
 * and film-grain post-processing. all three.js state stays private, so the public
 * setters below are the only surface the Inspect panel touches.
 */
export class CurlyLightScene {
  private state: AppState;

  // live three.js objects the public setters mutate, kept private so the panel
  // surface only ever touches the setter API below
  private ambientLight!: AmbientLight;
  private followLight!: PointLight;
  private dirLight1!: DirectionalLight;
  private dirLight2!: DirectionalLight;
  private bloomPass!: UnrealBloomPass;
  private noisePass!: ShaderPass;
  private floorMaterial!: MeshStandardMaterial;
  private particleMaterial!: RawShaderMaterial;

  /** create the renderer, camera, and initial app state, then build the scene via init(). */
  constructor() {
    this.state = {
      scene: new Scene(),
      camera: new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 10, 10000),
      renderer: new WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false
      }),
      composer: null as any,
      timer: new Timer(),
      particles: null,
      mousePosition: new Vector2(0, 0),
      mouse3d: new Vector3(),
      ray: new Ray(),
      isMouseInWindow: false,
      gpuCompute: null,
      positionVariable: null,
      velocityVariable: null,
      particleSize: 512,
      particleCount: 512 * 512,
      mouseRef: { x: 0, y: 0, focus: false, targetX: 0, targetY: 0 }
    };

    this.init();
  }

  /** configure the renderer and scene, then build lights, GPU compute, particles, floor, post-processing, and input. */
  private init(): void {
    const { scene, camera, renderer } = this.state;

    // Setup renderer
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = BasicShadowMap;

    const appElement = document.getElementById("app");
    if (!appElement) {
      throw new Error("App element not found");
    }
    appElement.appendChild(renderer.domElement);

    // Setup scene
    scene.background = new Color(0x000021);
    scene.fog = new Fog(0x000021, 0.01, 3000);

    // Setup camera
    camera.position.set(0, 0, 400);
    camera.lookAt(0, 0, 0);

    // Setup lights
    this.setupLights();

    // Setup GPU computation
    this.setupGPUComputation();

    // Setup particles
    this.setupParticles();

    // Setup floor
    this.setupFloor();

    // Setup post-processing
    this.setupPostProcessing();

    // Setup event listeners
    this.setupEventListeners();
    // the render loop is driven by the host (main.ts) via renderFrame(),
    // so it can cap the frame rate and feed the perf monitor.
  }

  /** add ambient, a shadow-casting follow light, and two directional lights, keeping typed references for the setters. */
  private setupLights(): void {
    const { scene } = this.state;

    // Ambient light
    const ambientLight = new AmbientLight(0x121212, 0.05);
    scene.add(ambientLight);

    // Follow light (bright light above cursor for shadow testing)
    const followLight = new PointLight(0xffffff, 150000, 5000, 2.1);
    followLight.position.set(0, 500, 25);
    followLight.castShadow = true;
    followLight.shadow.camera.near = 10;
    followLight.shadow.camera.far = 5000;
    followLight.shadow.bias = 0.01;
    followLight.shadow.radius = 0;
    followLight.shadow.mapSize.set(4096, 4096);
    scene.add(followLight);

    // Store lights for animation
    (this.state as any).followLight = followLight;

    // Directional lights
    const dirLight1 = new DirectionalLight(0x0055ff, 1.37);
    dirLight1.position.set(1, 1, 1);
    scene.add(dirLight1);

    const dirLight2 = new DirectionalLight(0xaa5500, 1.36);
    dirLight2.position.set(1, 1, -1);
    scene.add(dirLight2);

    // keep typed references for the public setter API
    this.ambientLight = ambientLight;
    this.followLight = followLight;
    this.dirLight1 = dirLight1;
    this.dirLight2 = dirLight2;
  }

  /** seed the position and velocity textures and register them as GPU-compute variables with cross dependencies. */
  private setupGPUComputation(): void {
    const { renderer, particleSize } = this.state;

    // Create GPU computation renderer
    const gpuCompute = new GPUComputationRenderer(particleSize, particleSize, renderer);

    // Create textures
    const positionTexture = gpuCompute.createTexture();
    const velocityTexture = gpuCompute.createTexture();

    // Init position texture
    const posData = positionTexture.image.data!;
    for (let i = 0, l = posData.length; i < l; i += 4) {
      const radius = (0.5 + Math.random() * 0.5) * 50;
      const phi = (Math.random() - 0.5) * Math.PI;
      const theta = Math.random() * Math.PI * 2.0;
      posData[i + 0] = radius * Math.cos(theta) * Math.cos(phi);
      posData[i + 1] = radius * Math.sin(phi);
      posData[i + 2] = radius * Math.sin(theta) * Math.cos(phi);
      posData[i + 3] = Math.random();
    }

    // Init velocity texture
    const velData = velocityTexture.image.data!;
    for (let i = 0, l = velData.length; i < l; i += 4) {
      velData[i + 0] = Math.random() * 20 - 10;
      velData[i + 1] = Math.random() * 20 - 10;
      velData[i + 2] = Math.random() * 20 - 10;
      velData[i + 3] = 0;
    }

    // Add variables
    const positionVariable = gpuCompute.addVariable(
      "texturePosition",
      this.getComputePositionFragment(),
      positionTexture
    );
    const velocityVariable = gpuCompute.addVariable(
      "textureVelocity",
      this.getComputeVelocityFragment(),
      velocityTexture
    );

    // Set dependencies
    gpuCompute.setVariableDependencies(positionVariable, [positionVariable, velocityVariable]);
    gpuCompute.setVariableDependencies(velocityVariable, [velocityVariable, positionVariable]);

    // Setup uniforms
    const positionUniforms = positionVariable.material.uniforms;
    positionUniforms.mouse3d = { value: new Vector3() };
    positionUniforms.textureDefaultPosition = { value: positionTexture.clone() };
    positionUniforms.time = { value: 0 };
    positionUniforms.fft = { value: 0.0 };

    const velocityUniforms = velocityVariable.material.uniforms;
    velocityUniforms.mouse3d = { value: new Vector3() };
    velocityUniforms.textureDefaultPosition = { value: positionTexture.clone() };
    velocityUniforms.time = { value: 0 };
    velocityUniforms.alpha = { value: 0.0 };
    velocityUniforms.fft = { value: 0.0 };

    // Init
    gpuCompute.init();

    this.state.gpuCompute = gpuCompute;
    this.state.positionVariable = positionVariable;
    this.state.velocityVariable = velocityVariable;
  }

  /** GLSL that integrates particle position, respawning a particle at the follow point when its life runs out. */
  private getComputePositionFragment(): string {
    return /* glsl */ `
      uniform vec3 mouse3d;
      uniform float time;
      uniform float fft;
      uniform sampler2D textureDefaultPosition;

      void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        vec4 texturePos = texture(texturePosition, uv);
        vec4 textureVel = texture(textureVelocity, uv);
        vec4 defaultPos = texture(textureDefaultPosition, uv);
        vec3 pos = texturePos.xyz;
        vec3 vel = textureVel.xyz;
        float life = texturePos.w - 0.012;
        vec3 followPos = mouse3d;
        followPos.z += fft * 210.0;
        if (life < 0.0) {
          texturePos = texture(textureDefaultPosition, uv);
          pos = texturePos.xyz * (0.35 + fft) + followPos;
          life = 0.5 + fract(texturePos.w * 21.4131 + 0.1);
        } else {
          vec3 delta = followPos - pos;
          pos += delta * (0.001 - (fft / 70.0));
          pos += vel;
        }
        fragColor = vec4(pos, life);
      }
    `;
  }

  /** GLSL that advances particle velocity with a 4d simplex curl-noise flow field. */
  private getComputeVelocityFragment(): string {
    return /* glsl */ `
      uniform vec3 mouse3d;
      uniform sampler2D textureDefaultPosition;
      uniform float time;
      uniform float alpha;
      uniform float fft;

      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      float mod289(float x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
      float permute(float x) { return mod289(((x * 34.0) + 1.0) * x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
      float taylorInvSqrt(float r) { return 1.79284291400159 - 0.85373472095314 * r; }
      vec4 grad4(float j, vec4 ip) {
        const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
        vec4 p,s;
        p.xyz = floor(fract(vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
        p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
        s = vec4(lessThan(p, vec4(0.0)));
        p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www;
        return p;
      }

      vec4 snoise4 (vec4 v) {
        const vec4  C = vec4(
          +0.138196601125011,
          +0.276393202250021,
          +0.414589803375032,
          -0.447213595499958
        );
        vec4 i  = floor(v + dot(v, vec4(0.309016994374947451)));
        vec4 x0 = v - i + dot(i, C.xxxx);
        vec4 i0;
        vec3 isX = step(x0.yzw, x0.xxx);
        vec3 isYZ = step(x0.zww, x0.yyz);
        i0.x = isX.x + isX.y + isX.z;
        i0.yzw = 1.0 - isX;
        i0.y += isYZ.x + isYZ.y;
        i0.zw += 1.0 - isYZ.xy;
        i0.z += isYZ.z;
        i0.w += 1.0 - isYZ.z;
        vec4 i3 = clamp(i0, 0.0, 1.0);
        vec4 i2 = clamp(i0 - 1.0, 0.0, 1.0);
        vec4 i1 = clamp(i0 - 2.0, 0.0, 1.0);
        vec4 x1 = x0 - i1 + C.xxxx;
        vec4 x2 = x0 - i2 + C.yyyy;
        vec4 x3 = x0 - i3 + C.zzzz;
        vec4 x4 = x0 + C.wwww;
        i = mod289(i);
        float j0 = permute(permute(permute(permute(i.w) + i.z) + i.y) + i.x);
        vec4 j1 = permute(permute(permute(permute(i.w + vec4(i1.w, i2.w, i3.w, 1.0)) + i.z + vec4(i1.z, i2.z, i3.z, 1.0)) + i.y + vec4(i1.y, i2.y, i3.y, 1.0)) + i.x + vec4(i1.x, i2.x, i3.x, 1.0));
        vec4 ip = vec4(1.0 / 294.0, 1.0 / 49.0, 1.0 / 7.0, 0.0);
        vec4 p0 = grad4(j0, ip);
        vec4 p1 = grad4(j1.x, ip);
        vec4 p2 = grad4(j1.y, ip);
        vec4 p3 = grad4(j1.z, ip);
        vec4 p4 = grad4(j1.w, ip);
        vec4 norm = taylorInvSqrt(
          vec4(
            dot(p0, p0),
            dot(p1, p1),
            dot(p2, p2),
            dot(p3,p3)
          )
        );
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;
        p4 *= taylorInvSqrt(dot(p4, p4));
        vec3 values0 = vec3(dot(p0, x0), dot(p1, x1), dot(p2, x2));
        vec2 values1 = vec2(dot(p3, x3), dot(p4, x4));
        vec3 m0 = max(0.5 - vec3(dot(x0, x0), dot(x1, x1), dot(x2, x2)), 0.0);
        vec2 m1 = max(0.5 - vec2(dot(x3, x3), dot(x4, x4)), 0.0);
        vec3 temp0 = -6.0 * m0 * m0 * values0;
        vec2 temp1 = -6.0 * m1 * m1 * values1;
        vec3 mmm0 = m0 * m0 * m0;
        vec2 mmm1 = m1 * m1 * m1;
        float dx = (
          temp0[0] * x0.x + temp0[1] * x1.x + temp0[2] * x2.x + temp1[0] * x3.x + temp1[1] * x4.x +
          mmm0[0] * p0.x + mmm0[1] * p1.x + mmm0[2] * p2.x + mmm1[0] * p3.x + mmm1[1] * p4.x
        );
        float dy = (
          temp0[0] * x0.y + temp0[1] * x1.y + temp0[2] * x2.y + temp1[0] * x3.y + temp1[1] * x4.y +
          mmm0[0] * p0.y + mmm0[1] * p1.y + mmm0[2] * p2.y + mmm1[0] * p3.y + mmm1[1] * p4.y
        );
        float dz = (
          temp0[0] * x0.z + temp0[1] * x1.z + temp0[2] * x2.z + temp1[0] * x3.z + temp1[1] * x4.z +
          mmm0[0] * p0.z + mmm0[1] * p1.z + mmm0[2] * p2.z + mmm1[0] * p3.z + mmm1[1] * p4.z
        );
        float dw = (
          temp0[0] * x0.w + temp0[1] * x1.w + temp0[2] * x2.w + temp1[0] * x3.w + temp1[1] * x4.w +
          mmm0[0] * p0.w + mmm0[1] * p1.w + mmm0[2] * p2.w + mmm1[0] * p3.w + mmm1[1] * p4.w
        );
        return vec4(dx, dy, dz, dw) * 49.0;
      }

      vec3 curl(in vec3 p, in float noiseTime, in float persistence) {
        vec4 xNoisePotentialDerivatives = vec4(0.0);
        vec4 yNoisePotentialDerivatives = vec4(0.0);
        vec4 zNoisePotentialDerivatives = vec4(0.0);
        for (int i = 0; i < 3; ++i) {
          float twoPowI = pow(abs(2.0), float(i));
          float scale = 0.5 * twoPowI * pow(persistence, float(i));
          xNoisePotentialDerivatives += snoise4(vec4(p * twoPowI, noiseTime)) * scale;
          yNoisePotentialDerivatives += snoise4(vec4((p + vec3(123.4, 129845.6, -1239.1)) * twoPowI, noiseTime)) * scale;
          zNoisePotentialDerivatives +=snoise4(vec4((p + vec3(-9519.0, 9051.0, -123.0)) * twoPowI, noiseTime)) * scale;
        }

        return vec3(
          zNoisePotentialDerivatives[1] - yNoisePotentialDerivatives[2],
          xNoisePotentialDerivatives[2] - zNoisePotentialDerivatives[0],
          yNoisePotentialDerivatives[0] - xNoisePotentialDerivatives[1]
        );
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        vec4 texturePos = texture(texturePosition, uv);
        vec4 textureVel = texture(textureVelocity, uv);
        vec3 vel = textureVel.xyz;
        vec3 pos = texturePos.xyz;
        vel += curl(pos * 0.02, time, 0.04 + (sin(time * 0.5) * 0.01) - fft * 0.01) * 0.75;
        vel *= 0.32 + (fft * 0.7);
        fragColor = vec4(vel * alpha, 0.0);
      }
    `;
  }

  /** build the particle Points with its render material and a separate distance material for shadow casting. */
  private setupParticles(): void {
    const { particleSize, particleCount } = this.state;

    const geometry = new BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const uvs = new Float32Array(particleCount * 2);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i2 = i * 2;
      const i3 = i * 3;

      uvs[i2 + 0] = (i % particleSize) / particleSize;
      uvs[i2 + 1] = Math.floor(i / particleSize) / particleSize;

      // Initialize vertex colors with random variations
      const randomHue = Math.random();
      const baseIntensity = 0.8 + Math.random() * 0.6;

      if (randomHue < 0.3) {
        // orange-leaning particles
        colors[i3 + 0] = baseIntensity;
        colors[i3 + 1] = baseIntensity * 0.6;
        colors[i3 + 2] = baseIntensity * 0.2;
      } else if (randomHue < 0.7) {
        // neutral particles
        colors[i3 + 0] = baseIntensity * 0.8;
        colors[i3 + 1] = baseIntensity * 0.8;
        colors[i3 + 2] = baseIntensity;
      } else {
        // blue-leaning particles
        colors[i3 + 0] = baseIntensity * 0.3;
        colors[i3 + 1] = baseIntensity * 0.7;
        colors[i3 + 2] = baseIntensity;
      }
    }

    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new BufferAttribute(uvs, 2));
    geometry.setAttribute("color", new BufferAttribute(colors, 3));

    const material = new RawShaderMaterial({
      uniforms: {
        texturePosition: { value: null },
        textureVelocity: { value: null },
        resolution: { value: new Vector2(window.innerWidth, window.innerHeight) },
        alpha: { value: 0.0 },
        mouse3d: { value: new Vector3() },
        uColorA: { value: new Color(1.0, 0.4, 0.1) },
        uColorB: { value: new Color(0.1, 0.3, 1.0) },
        uLifeColor1: { value: new Color(87.0 / 255.0, 115.0 / 255.0, 234.0 / 255.0) },
        uLifeColor2: { value: new Color(45.0 / 255.0, 37.0 / 255.0, 134.0 / 255.0) }
      },
      vertexShader: /* glsl */ `
        uniform sampler2D texturePosition;
        uniform sampler2D textureVelocity;
        uniform vec2 resolution;

        uniform mat4 projectionMatrix;
        uniform mat4 modelViewMatrix;
        uniform mat4 modelMatrix;
        uniform mat4 viewMatrix;

        in vec2 uv;
        in vec3 position;
        in vec3 color;
        out vec2 vUv;
        out float vLife;
        out vec3 vColor;

        void main() {
          vUv = uv;
          vColor = color;
          vec4 pos = texture(texturePosition, uv);
          vec4 vel = texture(textureVelocity, uv);
          vec4 worldPosition = modelMatrix * vec4(pos.xyz, 1.0);
          vec4 mvPosition = viewMatrix * worldPosition;
          vLife = pos.w;
          float ps = min(resolution.x, resolution.y) * 1.0;
          gl_PointSize = ps / length(mvPosition.xyz) * smoothstep(0.0, 0.9, pos.w);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;

        in vec2 vUv;
        in float vLife;
        in vec3 vColor;
        out vec4 fragColor;
        uniform mat4 viewMatrix;
        uniform float alpha;
        uniform sampler2D texturePosition;
        uniform vec3 mouse3d;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        uniform vec3 uLifeColor1;
        uniform vec3 uLifeColor2;

        void main(void) {
          vec4 particlePos = texture(texturePosition, vUv);
          float distanceFromCursor = length(particlePos.xyz - mouse3d);
          float distanceGradient = smoothstep(0.0, 150.0, distanceFromCursor);

          vec3 baseColor = mix(uColorA, uColorB, distanceGradient);

          // life gradient (x2 / x6 keep the original HDR boost for bloom)
          vec3 color2 = uLifeColor2 * 2.0;
          vec3 color1 = uLifeColor1 * 6.0;
          vec3 lifeColor = mix(color1, color2, smoothstep(1.0, 0.0, vLife));

          vec3 distanceLifeBlend = mix(lifeColor, baseColor, 0.8);
          vec3 outgoingLight = distanceLifeBlend * vColor;
          outgoingLight *= outgoingLight;

          fragColor = vec4(outgoingLight * alpha * (2.0 + vLife * 0.5) , 1.0);
        }
      `,
      glslVersion: "300 es"
    });

    // Custom distance material for shadow casting
    const customDistanceMaterial = new RawShaderMaterial({
      uniforms: {
        lightPos: { value: new Vector3(0, 465, 200) },
        texturePosition: { value: null },
        alpha: { value: 0.0 }
      },
      vertexShader: /* glsl */ `
        precision highp float;
        uniform sampler2D texturePosition;

        uniform mat4 projectionMatrix;
        uniform mat4 modelViewMatrix;
        uniform mat4 modelMatrix;
        uniform mat4 viewMatrix;

        in vec2 uv;
        out vec2 vUv;
        out vec4 vWorldPosition;

        void main() {
          vUv = uv;
          vec4 texturePos = texture(texturePosition, uv.xy);
          vec4 worldPosition = modelMatrix * vec4(texturePos.xyz, 1.0);
          vec4 mvPosition = viewMatrix * worldPosition;
          gl_PointSize = 8.0;
          vWorldPosition = worldPosition;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        uniform vec3 lightPos;
        uniform float alpha;

        in vec2 vUv;
        in vec4 vWorldPosition;
        out vec4 fragColor;

        vec4 pack1K(float depth) {
          depth /= 1000.0;
          const vec4 bitSh = vec4(256.0 * 256.0 * 256.0, 256.0 * 256.0, 256.0, 1.0);
          const vec4 bitMsk = vec4(0.0, 1.0 / 256.0, 1.0 / 256.0, 1.0 / 256.0);
          vec4 res = fract(depth * bitSh);
          res -= res.xxyz * bitMsk;
          return res;
        }

        void main(void) {
          fragColor = pack1K(length(vWorldPosition.xyz - lightPos.xyz));
          fragColor *= alpha;
        }
      `,
      depthTest: false,
      depthWrite: false,
      side: BackSide,
      blending: NoBlending,
      glslVersion: "300 es"
    });

    this.state.particles = new Points(geometry, material);
    (this.state.particles as any).customDistanceMaterial = customDistanceMaterial;
    this.state.particles.castShadow = true;
    this.state.scene.add(this.state.particles);

    this.particleMaterial = material;

    // Store custom distance material for updates
    (this.state as any).customDistanceMaterial = customDistanceMaterial;
  }

  /** add the shadow-receiving ground plane below the particle field. */
  private setupFloor(): void {
    const { scene } = this.state;

    // Calculate floor position
    const sphereRadius = 15;
    const minSphereY = -150;
    const floorY = minSphereY - sphereRadius;

    const floorGeometry = new PlaneGeometry(5000, 5000);
    const floorMaterial = new MeshStandardMaterial({
      color: 0x808080,
      roughness: 0.6,
      metalness: 0.4
    });

    const floor = new Mesh(floorGeometry, floorMaterial);
    floor.position.set(0, floorY, 0);
    floor.rotation.x = -Math.PI / 2.1;
    floor.receiveShadow = true;
    scene.add(floor);

    this.floorMaterial = floorMaterial;
  }

  /** build the EffectComposer chain: scene render, unreal bloom, film-grain, and output passes. */
  private setupPostProcessing(): void {
    const { scene, camera, renderer } = this.state;

    this.state.composer = new EffectComposer(renderer);

    const renderPass = new RenderPass(scene, camera);
    this.state.composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(new Vector2(window.innerWidth, window.innerHeight), 1.2, 1.0, 0.55);
    this.state.composer.addPass(bloomPass);

    const noisePass = new ShaderPass(
      new ShaderMaterial({
        uniforms: {
          tDiffuse: { value: null },
          opacity: { value: 0.012 },
          time: { value: 0 }
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform sampler2D tDiffuse;
          uniform float opacity;
          uniform float time;
          varying vec2 vUv;

          float random(vec2 co) {
            return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
          }

          void main() {
            vec4 color = texture2D(tDiffuse, vUv);
            // animate the grain by seeding the noise with time
            float noise = random(gl_FragCoord.xy + fract(time) * 100.0);
            gl_FragColor = vec4(color.rgb + noise * opacity, color.a);
          }
        `
      })
    );
    this.state.composer.addPass(noisePass);

    const outputPass = new OutputPass();
    this.state.composer.addPass(outputPass);

    this.bloomPass = bloomPass;
    this.noisePass = noisePass;
  }

  /** listen for window resize and track cursor position and focus for the mouse-follow behavior. */
  private setupEventListeners(): void {
    window.addEventListener("resize", this.onWindowResize.bind(this));

    const handleMouseMove = (event: MouseEvent) => {
      this.state.mouseRef.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.state.mouseRef.y = -(event.clientY / window.innerHeight) * 2 + 1;
      this.state.mouseRef.focus = true;
    };

    const handleMouseLeave = () => {
      this.state.mouseRef.focus = false;
    };

    const handleMouseEnter = () => {
      this.state.mouseRef.focus = true;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("mouseenter", handleMouseEnter);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseenter", handleMouseEnter);
    document.addEventListener("mouseleave", handleMouseLeave);
  }

  /** update camera aspect, renderer and composer size, and the particle resolution uniform on resize. */
  private onWindowResize(): void {
    const { camera, renderer, composer, particles } = this.state;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);

    if (particles) {
      const material = particles.material as RawShaderMaterial;
      material.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
    }
  }

  /**
   * project the smoothed cursor (or an idle oscillation when unfocused) into world
   * space along the camera ray, writing the result into state.mouse3d.
   */
  private updateMouse3d(): void {
    const { camera, ray, mouse3d, mouseRef, timer } = this.state;
    const time = timer.getElapsed();

    const oscillate = (min: number, max: number, t: number, speed: number) => {
      return min + (max - min) * (Math.sin(t * speed) + 1) * 0.5;
    };

    const round = (n: number, digits: number): number => {
      return Number(n.toFixed(digits));
    };

    const ease = (target: number, n: number, factor: number): number => {
      return round((target - n) * factor, 5);
    };

    // mouse interaction logic
    const horz = oscillate(0.7, 0.85, time, 0.4);
    const vert = oscillate(0.4, 0.6, time, 0.7);
    const sinTime = Math.sin(time * 1.22) * horz;
    const cosTime = Math.cos(time * 1.5) * vert;

    let speedFactor = 0.025;
    if (mouseRef.focus) {
      speedFactor = 0.12;
      mouseRef.targetX += ease(mouseRef.x, mouseRef.targetX, speedFactor);
      mouseRef.targetY += ease(mouseRef.y, mouseRef.targetY, speedFactor);
    } else {
      speedFactor = 0.025;
      mouseRef.targetX += ease(sinTime, mouseRef.targetX, speedFactor);
      mouseRef.targetY += ease(cosTime + 0.2, mouseRef.targetY, speedFactor);
    }

    // set camera position
    camera.position.set(0, 50, 400);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    // ray casting to get a mouse3d position
    ray.origin.setFromMatrixPosition(camera.matrixWorld);
    ray.direction.set(mouseRef.targetX, mouseRef.targetY, 0.5).unproject(camera).sub(ray.origin).normalize();

    const rayLength = ray.origin.length();
    const directionAngle = ray.direction.angleTo(ray.origin);
    const distance = rayLength / Math.cos(Math.PI - directionAngle);
    ray.origin.add(ray.direction.multiplyScalar(distance * 1.0));
    mouse3d.copy(ray.origin);
  }

  /** advance the simulation and render one frame. The host owns the rAF loop so
   * it can cap the frame rate; call this once per frame. */
  renderFrame(): void {
    const { composer, timer, gpuCompute, positionVariable, velocityVariable, particles } = this.state;
    timer.update();

    const time = timer.getElapsed();
    (this.state as any).followLight.position.copy(this.state.mouse3d.clone().add(new Vector3(0, 500, 0)));

    this.updateMouse3d();

    if (gpuCompute && positionVariable && velocityVariable) {
      // Update compute uniforms
      const positionUniforms = positionVariable.material.uniforms;
      const velocityUniforms = velocityVariable.material.uniforms;

      positionUniforms.mouse3d.value.copy(this.state.mouse3d);
      positionUniforms.time.value = time;
      positionUniforms.fft.value = -0.07 + Math.abs(Math.sin(time * 4.2)) * 0.07;

      velocityUniforms.mouse3d.value.copy(this.state.mouse3d);
      velocityUniforms.time.value = time;
      velocityUniforms.fft.value = -0.07 + Math.abs(Math.sin(time * 1.2)) * 0.1;
      velocityUniforms.alpha.value = Math.max(0.6, Math.min(1.0, 1.0));

      // Compute
      gpuCompute.compute();

      // Update particle material uniforms
      if (particles) {
        const material = particles.material as RawShaderMaterial;
        const opacity = Math.min(0.25, time / 2.0);
        material.uniforms.alpha.value += (opacity - material.uniforms.alpha.value) * 0.02;
        material.uniforms.texturePosition.value = gpuCompute.getCurrentRenderTarget(positionVariable).texture;
        material.uniforms.textureVelocity.value = gpuCompute.getCurrentRenderTarget(velocityVariable).texture;
        material.uniforms.mouse3d.value.copy(this.state.mouse3d);
      }

      // Update custom distance material for shadow casting
      const customDistanceMaterial = (this.state as any).customDistanceMaterial;
      if (customDistanceMaterial) {
        customDistanceMaterial.uniforms.texturePosition.value =
          gpuCompute.getCurrentRenderTarget(positionVariable).texture;
        customDistanceMaterial.uniforms.alpha.value =
          (particles?.material as RawShaderMaterial)?.uniforms.alpha.value || 0;
      }
    }

    // animate the film-grain noise
    this.noisePass.uniforms.time.value = time;

    composer.render();
  }

  /** renderer counters shaped for the perf monitor. */
  getRenderInfo(): {
    render: { triangles: number; drawCalls: number };
    memory: { geometries: number; textures: number };
  } {
    const info = this.state.renderer.info;
    return {
      render: { triangles: info.render.triangles, drawCalls: info.render.calls },
      memory: { geometries: info.memory.geometries, textures: info.memory.textures }
    };
  }

  // The Inspect panel talks to the scene only through these setters. Each takes
  // plain values (numbers, booleans, {r,g,b} in 0..1). no three.js leaks out,
  // so the panel's "surface of contact" stays a plain illustration of usage.

  /** set the ACES tone-mapping exposure; higher brightens the final image. */
  setExposure(value: number): void {
    this.state.renderer.toneMappingExposure = value;
  }

  /** enable or disable the bloom pass. */
  setBloomEnabled(enabled: boolean): void {
    this.bloomPass.enabled = enabled;
  }

  /** set the bloom intensity. */
  setBloomStrength(value: number): void {
    this.bloomPass.strength = value;
  }

  /** set the bloom blur radius. */
  setBloomRadius(value: number): void {
    this.bloomPass.radius = value;
  }

  /** set the luminance threshold above which pixels bloom. */
  setBloomThreshold(value: number): void {
    this.bloomPass.threshold = value;
  }

  /** enable or disable the film-grain pass. */
  setNoiseEnabled(enabled: boolean): void {
    this.noisePass.enabled = enabled;
  }

  /** set the film-grain overlay opacity. */
  setNoiseOpacity(value: number): void {
    this.noisePass.uniforms.opacity.value = value;
  }

  /** set the ambient light color. */
  setAmbientColor(c: RGB): void {
    this.ambientLight.color.setRGB(c.r, c.g, c.b, SRGBColorSpace);
  }

  /** set the ambient light intensity. */
  setAmbientIntensity(value: number): void {
    this.ambientLight.intensity = value;
  }

  /** set the cursor-following point light's color. */
  setFollowColor(c: RGB): void {
    this.followLight.color.setRGB(c.r, c.g, c.b, SRGBColorSpace);
  }

  /** set the cursor-following point light's intensity. */
  setFollowIntensity(value: number): void {
    this.followLight.intensity = value;
  }

  /** set the first directional light's color. */
  setDir1Color(c: RGB): void {
    this.dirLight1.color.setRGB(c.r, c.g, c.b, SRGBColorSpace);
  }

  /** set the first directional light's intensity. */
  setDir1Intensity(value: number): void {
    this.dirLight1.intensity = value;
  }

  /** set the second directional light's color. */
  setDir2Color(c: RGB): void {
    this.dirLight2.color.setRGB(c.r, c.g, c.b, SRGBColorSpace);
  }

  /** set the second directional light's intensity. */
  setDir2Intensity(value: number): void {
    this.dirLight2.intensity = value;
  }

  /** set the scene background and matching fog color. */
  setBackgroundColor(c: RGB): void {
    (this.state.scene.background as Color).setRGB(c.r, c.g, c.b, SRGBColorSpace);
    this.state.scene.fog?.color.setRGB(c.r, c.g, c.b, SRGBColorSpace);
  }

  /** set the floor material color. */
  setFloorColor(c: RGB): void {
    this.floorMaterial.color.setRGB(c.r, c.g, c.b, SRGBColorSpace);
  }

  /** set the particle color nearest the cursor. */
  setParticleColorA(c: RGB): void {
    (this.particleMaterial.uniforms.uColorA.value as Color).setRGB(c.r, c.g, c.b, SRGBColorSpace);
  }

  /** set the particle color farthest from the cursor. */
  setParticleColorB(c: RGB): void {
    (this.particleMaterial.uniforms.uColorB.value as Color).setRGB(c.r, c.g, c.b, SRGBColorSpace);
  }

  /** set the first particle life-gradient color. */
  setParticleLifeColor1(c: RGB): void {
    (this.particleMaterial.uniforms.uLifeColor1.value as Color).setRGB(c.r, c.g, c.b, SRGBColorSpace);
  }

  /** set the second particle life-gradient color. */
  setParticleLifeColor2(c: RGB): void {
    (this.particleMaterial.uniforms.uLifeColor2.value as Color).setRGB(c.r, c.g, c.b, SRGBColorSpace);
  }
}
