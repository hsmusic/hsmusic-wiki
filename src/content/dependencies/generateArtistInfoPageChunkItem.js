import {empty} from '#sugar';

export default {
  extraDependencies: ['html', 'language'],

  slots: {
    content: {
      type: 'html',
      mutable: false,
    },

    annotation: {type: 'string'},

    otherArtistLinks: {
      validate: v => v.strictArrayOf(v.isHTML),
    },

    rerelease: {type: 'boolean'},

    trimAnnotation: {
      type: 'boolean',
      default: false,
    },
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

          const annotation =
            (slots.trimAnnotation
              ? slots.annotation?.replace(/^edits for wiki(: )?/, '')
              : slots.annotation);

          if (annotation) {
            anyAccent = true;
            workingCapsule += '.withAnnotation';
            workingOptions.annotation = annotation;
          }

          if (anyAccent) {
            return language.$(workingCapsule, workingOptions);
          } else {
            return slots.content;
          }
        }))),
};
