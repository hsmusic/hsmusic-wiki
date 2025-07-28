export default {
  contentDependencies: ['linkThing'],
  extraDependencies: ['html', 'language'],

  relations: (relation, medium) => ({
    link:
      relation('linkThing', 'localized.medium', medium),
  }),

  data: (medium) => ({
    nameWithoutType:
      medium.name.replace(/\s*\([^()]*\)$/, ''),

    year:
      (medium.date
        ? medium.date.getFullYear()
        : null),
  }),

  slots: {
    linkSlots: {
      validate: v => v.isObject,
    },

    trimType: {
      type: 'boolean',
      default: false,
    },

    showYear: {
      type: 'boolean',
      default: false,
    },

    annotation: {
      type: 'html',
      mutable: false,
    },
  },

  generate: (data, relations, slots, {html, language}) =>
    html.tag('span', {class: 'medium'},
      {[html.noEdgeWhitespace]: true},

      language.encapsulate('misc.mediumLink', workingCapsule => {
        const workingOptions = {};
        const {link} = relations;

        if (slots.trimType) {
          link.setSlot('content', data.nameWithoutType);
        }

        if (slots.linkSlots) {
          link.setSlots(slots.linkSlots);
        }

        workingOptions.medium = link;

        if (slots.showYear && data.year) {
          workingCapsule += '.withYear';
          workingOptions.year = data.year;
        }

        if (!html.isBlank(slots.annotation)) {
          workingCapsule += '.withAnnotation';
          workingOptions.annotation = slots.annotation;
        }

        return language.$(workingCapsule, workingOptions);
      })),
};
