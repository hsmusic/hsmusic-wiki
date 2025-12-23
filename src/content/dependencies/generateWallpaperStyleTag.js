import {empty, stitchArrays} from '#sugar';

function findCSSProperty(property, properties) {
  if (!properties) return null;
  const regexp = new RegExp(String.raw`(?<=(?:^|;)\s*${property}: ).*?(?=;)`, 'ms' /* mad scrath */);
  const match = properties.match(regexp);
  return match?.[0] ?? null;
}

export default {
  relations: (relation) => ({
    styleTag:
      relation('generateStyleTag'),
  }),

  slots: {
    wallpaperBrightness: {
      validate: v => v.isNumber,
    },

    singleWallpaperPath: {
      validate: v => v.strictArrayOf(v.isString),
    },

    singleWallpaperStyle: {
      validate: v => v.isString,
    },

    wallpaperPartPaths: {
      validate: v =>
        v.strictArrayOf(v.optional(v.strictArrayOf(v.isString))),
    },

    wallpaperPartStyles: {
      validate: v =>
        v.strictArrayOf(v.optional(v.isString)),
    },
  },

  generate(relations, slots, {html, to}) {
    const attributes = html.attributes();
    const rules = [];

    attributes.add('class', 'wallpaper-style');

    let brightness = slots.wallpaperBrightness;

    const brightnessFrom = properties => {
      const opacity = findCSSProperty('opacity', properties);
      return Number(opacity) || null;
    };

    if (empty(slots.wallpaperPartPaths)) {
      attributes.set('data-wallpaper-mode', 'one');
      brightness ||= brightnessFrom(slots.singleWallpaperStyle);

      rules.push({
        select: 'body::before',
        declare: [
          `background-image: url("${to(...slots.singleWallpaperPath)}");`,
          slots.singleWallpaperStyle,
        ],
      });
    } else {
      attributes.set('data-wallpaper-mode', 'parts');
      attributes.set('data-num-wallpaper-parts', slots.wallpaperPartPaths.length);
      brightness ||= brightnessFrom(slots.wallpaperPartStyles[0]);

      stitchArrays({
        path: slots.wallpaperPartPaths,
        style: slots.wallpaperPartStyles,
      }).forEach(({path, style}, index) => {
          rules.push({
            select: `.wallpaper-part:nth-child(${index + 1})`,
            declare: [
              path && `background-image: url("${to(...path)}");`,
              style,
            ],
          });
        });

      rules.push({
        select: 'body::before',
        declare: [
          'display: none;',
        ],
      });
    }

    if (brightness) {
      rules.push({
        select: ':root',
        declare: [
          `--wallpaper-brightness: ${brightness};`,
        ],
      });
    }

    relations.styleTag.setSlots({
      attributes,
      rules,
    });

    return relations.styleTag;
  },
};
