import { color, slider, toggle } from "@mgz-dev/inspect";

import type { CurlyLightScene, RGB } from "./scene/curly-light";
import type { TabPageConfig } from "@mgz-dev/inspect";

/** 0xRRGGBB -> {r,g,b} in 0..1, so the defaults read straight from the scene's hexes. */
function rgb(hex: number): RGB {
  return {
    r: ((hex >> 16) & 0xff) / 255,
    g: ((hex >> 8) & 0xff) / 255,
    b: (hex & 0xff) / 255
  };
}

/**
 * The demo's "surface of contact" with Inspect.
 *
 * It owns a plain `params` object and wires every control's `onChange` to one
 * scene setter. There is no three.js here. just a clear illustration of how to
 * consume the panel: bind a control to a value, and on change push that value
 * into the app. All the complex simulation lives behind `CurlyLightScene`.
 */
export function buildTabs(scene: CurlyLightScene): TabPageConfig[] {
  const params = {
    particles: {
      colorA: { r: 1, g: 0.4, b: 0.1 },
      colorB: { r: 0.1, g: 0.3, b: 1 },
      life1: rgb(0x5773ea),
      life2: rgb(0x2d2586)
    },
    exposure: 1.0,
    bloom: { enabled: true, strength: 1.2, radius: 1.0, threshold: 0.55 },
    noise: { enabled: true, opacity: 0.012 },
    ambient: { color: rgb(0x121212), intensity: 0.05 },
    follow: { color: rgb(0xffffff), intensity: 150000 },
    dir1: { color: rgb(0x0055ff), intensity: 1.37 },
    dir2: { color: rgb(0xaa5500), intensity: 1.36 },
    background: rgb(0x000021),
    floor: rgb(0x808080)
  };

  return [
    {
      title: "CURLY LIGHT",
      folders: [
        {
          id: "particles",
          title: "Particles",
          expanded: true,
          controls: [
            color.of(params.particles, "colorA", { colorType: "float", label: "color A" }, () =>
              scene.setParticleColorA(params.particles.colorA)
            ),
            color.of(params.particles, "colorB", { colorType: "float", label: "color B" }, () =>
              scene.setParticleColorB(params.particles.colorB)
            ),
            color.of(params.particles, "life1", { colorType: "float", label: "life color 1" }, () =>
              scene.setParticleLifeColor1(params.particles.life1)
            ),
            color.of(params.particles, "life2", { colorType: "float", label: "life color 2" }, () =>
              scene.setParticleLifeColor2(params.particles.life2)
            )
          ]
        },
        {
          id: "post",
          title: "Post",
          expanded: true,
          controls: [
            slider.of(params, "exposure", { min: 0, max: 3, step: 0.01 }, () => scene.setExposure(params.exposure)),
            toggle.of(params.bloom, "enabled", { label: "bloom" }, () => scene.setBloomEnabled(params.bloom.enabled)),
            slider.of(params.bloom, "strength", { min: 0, max: 3, step: 0.01, label: "bloom strength" }, () =>
              scene.setBloomStrength(params.bloom.strength)
            ),
            slider.of(params.bloom, "radius", { min: 0, max: 1.3, step: 0.01, label: "bloom radius" }, () =>
              scene.setBloomRadius(params.bloom.radius)
            ),
            slider.of(params.bloom, "threshold", { min: 0.1, max: 0.7, step: 0.01, label: "bloom threshold" }, () =>
              scene.setBloomThreshold(params.bloom.threshold)
            ),
            toggle.of(params.noise, "enabled", { label: "film noise" }, () =>
              scene.setNoiseEnabled(params.noise.enabled)
            ),
            slider.of(params.noise, "opacity", { min: 0, max: 0.1, step: 0.001, label: "noise opacity" }, () =>
              scene.setNoiseOpacity(params.noise.opacity)
            )
          ]
        },
        {
          id: "lights",
          title: "Lights",
          expanded: true,
          controls: [
            color.of(params.ambient, "color", { colorType: "float", label: "ambient" }, () =>
              scene.setAmbientColor(params.ambient.color)
            ),
            slider.of(params.ambient, "intensity", { min: 0, max: 1, step: 0.01, label: "ambient power" }, () =>
              scene.setAmbientIntensity(params.ambient.intensity)
            ),
            color.of(params.follow, "color", { colorType: "float", label: "follow" }, () =>
              scene.setFollowColor(params.follow.color)
            ),
            slider.of(params.follow, "intensity", { min: 0, max: 500000, step: 1000, label: "follow power" }, () =>
              scene.setFollowIntensity(params.follow.intensity)
            ),
            color.of(params.dir1, "color", { colorType: "float", label: "dir 1" }, () =>
              scene.setDir1Color(params.dir1.color)
            ),
            slider.of(params.dir1, "intensity", { min: 0, max: 5, step: 0.01, label: "dir 1 power" }, () =>
              scene.setDir1Intensity(params.dir1.intensity)
            ),
            color.of(params.dir2, "color", { colorType: "float", label: "dir 2" }, () =>
              scene.setDir2Color(params.dir2.color)
            ),
            slider.of(params.dir2, "intensity", { min: 0, max: 5, step: 0.01, label: "dir 2 power" }, () =>
              scene.setDir2Intensity(params.dir2.intensity)
            )
          ]
        },
        {
          id: "environment",
          title: "Environment",
          expanded: true,
          controls: [
            color.of(params, "background", { colorType: "float", label: "background" }, () =>
              scene.setBackgroundColor(params.background)
            ),
            color.of(params, "floor", { colorType: "float", label: "floor" }, () => scene.setFloorColor(params.floor))
          ]
        }
      ]
    }
  ];
}
