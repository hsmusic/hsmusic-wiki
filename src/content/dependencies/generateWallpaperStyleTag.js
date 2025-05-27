import {empty, stitchArrays} from '#sugar';

export default {
  contentDependencies: ['generateStyleTag'],
  extraDependencies: ['html', 'to'],

  relations: (relation) => ({
    styleTag:
      relation('generateStyleTag'),
  }),

  slots: {
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

    if (empty(slots.wallpaperPartPaths)) {
      attributes.set('data-wallpaper-mode', 'one');

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

    relations.styleTag.setSlots({
      attributes,
      rules,
    });

    return relations.styleTag;
  },
};
