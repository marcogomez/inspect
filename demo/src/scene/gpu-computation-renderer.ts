import type {
  MagnificationTextureFilter,
  MinificationTextureFilter,
  ShaderMaterial,
  Texture,
  TextureDataType,
  WebGLRenderer,
  Wrapping
} from "three";
import {
  Camera,
  ClampToEdgeWrapping,
  DataTexture,
  FloatType,
  LinearSRGBColorSpace,
  Mesh,
  NearestFilter,
  NoToneMapping,
  PlaneGeometry,
  RawShaderMaterial,
  RGBAFormat,
  Scene,
  WebGLRenderTarget
} from "three";

export interface Variable {
  name: string;
  initialValueTexture: Texture;
  material: ShaderMaterial;
  dependencies: Variable[] | null;
  renderTargets: WebGLRenderTarget[];
  wrapS: Wrapping | null;
  wrapT: Wrapping | null;
  minFilter: MinificationTextureFilter;
  magFilter: MagnificationTextureFilter;
}

interface ITexture {
  value: Texture | null;
}

/**
 * GPU-side field simulation over ping-pong render targets. each variable owns two
 * float render targets; compute() renders its fragment shader into the back target
 * using the front targets (and any declared dependencies) as inputs, then swaps
 * front and back so the next step reads the freshly written values.
 */
class GPUComputationRenderer {
  sizeX: number;
  sizeY: number;
  renderer: WebGLRenderer;
  currentTextureIndex: number = 0;
  variables: Variable[] = [];
  dataType: TextureDataType;
  scene: Scene;
  camera: Camera;
  passThruUniforms: Record<string, ITexture>;
  passThruShader: RawShaderMaterial;
  mesh: Mesh<PlaneGeometry, RawShaderMaterial>;

  /**
   * @param sizeX - compute texture width in texels
   * @param sizeY - compute texture height in texels
   * @param renderer - the WebGL renderer used to run the compute passes
   */
  constructor(sizeX: number, sizeY: number, renderer: WebGLRenderer) {
    this.sizeX = sizeX;
    this.sizeY = sizeY;
    this.renderer = renderer;
    this.dataType = FloatType;
    this.scene = new Scene();
    this.camera = new Camera();
    this.camera.position.z = 1;
    this.passThruUniforms = {
      passThruTexture: { value: null }
    };
    this.passThruShader = this.createPassThroughMaterial(this.passThruUniforms);
    this.mesh = new Mesh(new PlaneGeometry(2, 2), this.passThruShader);
    this.scene.add(this.mesh);

    this.init = this.init.bind(this);
    this.compute = this.compute.bind(this);
    this.getCurrentRenderTarget = this.getCurrentRenderTarget.bind(this);
    this.getAlternateRenderTarget = this.getAlternateRenderTarget.bind(this);
    this.dispose = this.dispose.bind(this);
    this.createRenderTarget = this.createRenderTarget.bind(this);
    this.createTexture = this.createTexture.bind(this);
    this.renderTexture = this.renderTexture.bind(this);
    this.doRenderTarget = this.doRenderTarget.bind(this);
    this.setDataType = this.setDataType.bind(this);
    this.getPassThroughVertexShader = this.getPassThroughVertexShader.bind(this);
    this.getPassThroughFragmentShader = this.getPassThroughFragmentShader.bind(this);
    this.getComputeFragment = this.getComputeFragment.bind(this);
    this.createShaderMaterial = this.createShaderMaterial.bind(this);
    this.addVariable = this.addVariable.bind(this);
    this.setVariableDependencies = this.setVariableDependencies.bind(this);
  }

  /**
   * allocate both render targets for every variable, seed them from the initial
   * textures, and inject a `uniform sampler2D` plus a matching uniform for each
   * declared dependency so a variable's shader can sample the others.
   */
  init(): void {
    for (let i = 0; i < this.variables.length; i++) {
      const variable = this.variables[i]!;
      variable.renderTargets[0] = this.createRenderTarget(
        this.sizeX,
        this.sizeY,
        variable.wrapS!,
        variable.wrapT!,
        variable.minFilter,
        variable.magFilter
      );
      variable.renderTargets[1] = this.createRenderTarget(
        this.sizeX,
        this.sizeY,
        variable.wrapS!,
        variable.wrapT!,
        variable.minFilter,
        variable.magFilter
      );
      this.renderTexture(variable.initialValueTexture, variable.renderTargets[0]);
      this.renderTexture(variable.initialValueTexture, variable.renderTargets[1]);
      const { material } = variable;
      const { uniforms } = material;

      if (variable.dependencies !== null) {
        for (let d = 0; d < variable.dependencies.length; d++) {
          const depVar = variable.dependencies[d]!;
          if (depVar.name !== variable.name) {
            let found = false;
            for (let j = 0; j < this.variables.length; j++) {
              if (depVar.name === this.variables[j]!.name) {
                found = true;
                break;
              }
            }
            if (!found) {
              // eslint-disable-next-line no-console
              console.error(`Variable dependency not found. Variable=${variable.name}, dependency=${depVar.name}`);
            }
          }
          uniforms[depVar.name] = { value: null };
          material.fragmentShader = `\nuniform sampler2D ${depVar.name};\n${material.fragmentShader}`;
        }
      }
    }
    this.currentTextureIndex = 0;
  }

  /**
   * advance every variable one step: bind each dependency's current texture,
   * render the variable's shader into its back target, then flip the current
   * texture index so reads and writes swap for the next call.
   */
  compute(): void {
    const { currentTextureIndex } = this;
    const nextTextureIndex = this.currentTextureIndex === 0 ? 1 : 0;
    for (let i = 0, il = this.variables.length; i < il; i++) {
      const variable = this.variables[i];
      if (variable!.dependencies !== null) {
        const { uniforms } = variable!.material;
        for (let d = 0, dl = variable!.dependencies.length; d < dl; d++) {
          const depVar = variable!.dependencies[d]!;
          uniforms[depVar.name]!.value = depVar.renderTargets[currentTextureIndex]!.texture;
        }
      }

      this.doRenderTarget(variable!.material as RawShaderMaterial, variable!.renderTargets[nextTextureIndex]!);
    }

    this.currentTextureIndex = nextTextureIndex;
  }

  /** the render target holding the variable's most recently written texture. */
  getCurrentRenderTarget(variable: Variable): WebGLRenderTarget {
    return variable.renderTargets[this.currentTextureIndex]!;
  }

  /** the variable's other (previous) render target, the one compute() writes next. */
  getAlternateRenderTarget(variable: Variable): WebGLRenderTarget {
    return variable.renderTargets[this.currentTextureIndex === 0 ? 1 : 0]!;
  }

  /** free the pass-through mesh, every variable's initial texture, and both render targets. */
  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    const { variables } = this;
    for (let i = 0; i < variables.length; i++) {
      const variable = variables[i];
      variable!.initialValueTexture?.dispose();
      const { renderTargets } = variable!;
      for (let j = 0; j < renderTargets.length; j++) {
        const renderTarget = renderTargets[j];
        renderTarget!.dispose();
      }
    }
  }

  /** create a float RGBA render target with no depth buffer, defaulting size and filters to the compute settings. */
  createRenderTarget(
    sizeXTexture: number,
    sizeYTexture: number,
    wrapS: Wrapping,
    wrapT: Wrapping,
    minFilter: MinificationTextureFilter,
    magFilter: MagnificationTextureFilter
  ) {
    sizeXTexture = sizeXTexture || this.sizeX;
    sizeYTexture = sizeYTexture || this.sizeY;
    wrapS = wrapS || ClampToEdgeWrapping;
    wrapT = wrapT || ClampToEdgeWrapping;
    minFilter = minFilter || NearestFilter;
    magFilter = magFilter || NearestFilter;

    const renderTarget = new WebGLRenderTarget(sizeXTexture, sizeYTexture, {
      wrapS,
      wrapT,
      minFilter,
      magFilter,
      format: RGBAFormat,
      type: this.dataType,
      depthBuffer: false
    });

    return renderTarget;
  }

  /** allocate a zeroed float RGBA DataTexture sized to the compute grid. */
  createTexture(): DataTexture {
    const data = new Float32Array(this.sizeX * this.sizeY * 4);
    const texture = new DataTexture(data, this.sizeX, this.sizeY, RGBAFormat, FloatType);
    texture.needsUpdate = true;
    return texture;
  }

  /** copy a source texture into a render target through the pass-through shader. */
  renderTexture(input: Texture, output: WebGLRenderTarget) {
    this.passThruUniforms.passThruTexture!.value = input;
    this.doRenderTarget(this.passThruShader, output);
    this.passThruUniforms.passThruTexture!.value = null;
  }

  /**
   * render the full-screen quad with the given material into a render target,
   * temporarily disabling xr, shadow auto-update, tone mapping, and color-space
   * conversion so the pass writes raw values, then restoring the renderer state.
   */
  doRenderTarget(material: RawShaderMaterial, output: WebGLRenderTarget) {
    const currentRenderTarget = this.renderer.getRenderTarget();
    const currentXrEnabled = this.renderer.xr.enabled;
    const currentShadowAutoUpdate = this.renderer.shadowMap.autoUpdate;
    const currentOutputColorSpace = this.renderer.outputColorSpace;
    const currentToneMapping = this.renderer.toneMapping;
    this.renderer.xr.enabled = false;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.outputColorSpace = LinearSRGBColorSpace;
    this.renderer.toneMapping = NoToneMapping;

    this.mesh.material = material;
    this.renderer.setRenderTarget(output);
    this.renderer.render(this.scene, this.camera);
    this.mesh.material = this.passThruShader;

    this.renderer.xr.enabled = currentXrEnabled;
    this.renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;
    this.renderer.outputColorSpace = currentOutputColorSpace;
    this.renderer.toneMapping = currentToneMapping;

    this.renderer.setRenderTarget(currentRenderTarget);
  }

  /** set the texel data type used for render targets created afterward. */
  setDataType(type: TextureDataType) {
    this.dataType = type;
  }

  /** GLSL for the full-screen pass, defining `resolution` from the compute grid size. */
  getPassThroughVertexShader(): string {
    const define = `#define resolution vec2(${this.sizeX}, ${this.sizeY})`;
    const passThroughVertex = /* glsl */ `
    precision highp float;
    ${define}
    in vec2 uv;
    in vec3 position;
    uniform mat4 projectionMatrix;
    uniform mat4 modelViewMatrix;
    out vec2 vUv;
    void main(void) {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
    `;
    return passThroughVertex;
  }

  /** GLSL that samples `passThruTexture` unchanged; used to seed and copy targets. */
  // eslint-disable-next-line class-methods-use-this
  getPassThroughFragmentShader(): string {
    const fragment = /* glsl */ `
    precision highp float;
    uniform sampler2D passThruTexture;
    in vec2 vUv;
    out vec4 fragColor;
    void main(void) {
      vec2 uv = vUv;
      fragColor = texture(passThruTexture, uv);
    }
    `;
    return fragment;
  }

  /** wrap a user compute shader with the float-precision header, `fragColor` output, and `resolution` define. */
  getComputeFragment(computeFragmentShader: string): string {
    const define = `#define resolution vec2(${this.sizeX}, ${this.sizeY})`;
    const frags: string[] = computeFragmentShader.split(/\r?\n/);
    let fragment: string = "";
    for (let i = 0; i < frags.length; i++) {
      fragment += frags[i] + "\n";
    }
    fragment = `precision highp float;\nout vec4 fragColor;\n${define}\n${fragment}`;
    return fragment;
  }

  /** build the RawShaderMaterial that copies a texture through unchanged. */
  createPassThroughMaterial(uniforms: Record<string, ITexture>) {
    const material = new RawShaderMaterial({
      uniforms,
      vertexShader: this.getPassThroughVertexShader(),
      fragmentShader: this.getPassThroughFragmentShader(),
      glslVersion: "300 es"
    });
    return material;
  }

  /** build a variable's RawShaderMaterial from its wrapped compute fragment shader. */
  createShaderMaterial(computeFragmentShader: string, uniforms: Record<string, ITexture>) {
    const frag = this.getComputeFragment(computeFragmentShader);
    const material = new RawShaderMaterial({
      uniforms,
      vertexShader: this.getPassThroughVertexShader(),
      fragmentShader: frag,
      glslVersion: "300 es"
    });
    return material;
  }

  /**
   * register a simulated variable: compile its compute material and record its
   * name, initial texture, and default wrap/filter settings. dependencies are
   * attached separately via setVariableDependencies before init().
   * @returns the created variable handle
   */
  addVariable(variableName: string, computeFragmentShader: string, initialValueTexture: Texture): Variable {
    const material = this.createShaderMaterial(computeFragmentShader, this.passThruUniforms);

    const variable: Variable = {
      name: variableName,
      initialValueTexture,
      material,
      dependencies: null,
      renderTargets: [],
      wrapS: null,
      wrapT: null,
      minFilter: NearestFilter,
      magFilter: NearestFilter
    };

    this.variables.push(variable);

    return variable;
  }

  /** declare which variables a variable's shader samples; init() wires them into its uniforms. */
  // eslint-disable-next-line class-methods-use-this
  setVariableDependencies(variable: Variable, dependencies: Variable[]): void {
    variable.dependencies = dependencies;
  }
}

export { GPUComputationRenderer };
