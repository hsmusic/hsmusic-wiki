import {empty} from '#sugar';

export default {
  extraDependencies: ['html', 'language'],

  slots: {
    content: {
      type: 'html',
      mutable: false,
    },

    annotation: {
      type: 'html',
      mutable: false,
    },

    otherArtistLinks: {
      validate: v => v.strictArrayOf(v.isHTML),
    },

    rerelease: {type: 'boolean'},
  },

  generate: (slots, {html, language}) =>
    language.encapsulate('artistPage.creditList.entry', entryCapsule =>
      html.tag('li',
        slots.rerelease && {class: 'rerelease'},

        language.encapsulate(entryCapsule, workingCapsule => {
          const workingOptions = {entry: slots.content};

          if (slots.rerelease) {
            workingCapsule += '.rerelease';
            return language.$(workingCapsule, workingOptions);
          }

          let anyAccent = false;

          if (!empty(slots.otherArtistLinks)) {
            anyAccent = true;
            workingCapsule += '.withArtists';
            workingOptions.artists =
              language.formatConjunctionList(slots.otherArtistLinks);
          }

          if (!html.isBlank(slots.annotation)) {
            anyAccent = true;
            workingCapsule += '.withAnnotation';
            workingOptions.annotation = slots.annotation;
          }

          if (anyAccent) {
            return language.$(workingCapsule, workingOptions);
          } else {
            return slots.content;
          }
        }))),
};
