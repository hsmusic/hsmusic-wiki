// Color and theming utility functions! Handy.

export function getColors(themeColor, {
  // chroma.js external dependency (https://gka.github.io/chroma.js/)
  chroma,
} = {}) {
  if (!chroma) {
    throw new Error('chroma.js library must be passed or bound for color manipulation');
  }

  const primary = chroma(themeColor);

  const dark = primary.luminance(0.02);
  const dim = primary.desaturate(2).darken(1.5);
  const light = chroma.average(['#ffffff', primary], 'rgb', [4, 1]);

  const bg = primary.luminance(0.008).desaturate(3.5).alpha(0.8);
  const bgBlack = primary.saturate(1).luminance(0.0025).alpha(0.8);
  const shadow = primary.desaturate(4).set('hsl.l', 0.05).alpha(0.8);

  const hsl = primary.hsl();
  if (isNaN(hsl[0])) hsl[0] = 0;

  return {
    primary: primary.hex(),

    dark: dark.hex(),
    dim: dim.hex(),
    light: light.hex(),

    bg: bg.hex(),
    bgBlack: bgBlack.hex(),
    shadow: shadow.hex(),

    rgb: primary.rgb(),
    hsl,
  };
}
