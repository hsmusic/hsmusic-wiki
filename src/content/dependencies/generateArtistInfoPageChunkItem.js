import {empty} from '#sugar';

export default {
  relations: (relation) => ({
    textWithTooltip:
      relation('generateTextWithTooltip'),
  }),

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

    rereleaseTooltip: {
      type: 'html',
      mutable: false,
    },

    firstReleaseTooltip: {
      type: 'html',
      mutable: false,
    },

    originDetails: {
      type: 'html',
      mutable: false,
    },
  },

  generate: (relations, slots, {html, language}) =>
    language.encapsulate('artistPage.creditList.entry', entryCapsule =>
      html.tag('li',
        slots.rerelease && {class: 'rerelease'},

        html.tags([
          language.encapsulate(entryCapsule, workingCapsule => {
            const workingOptions = {entry: slots.content};

            if (!html.isBlank(slots.rereleaseTooltip)) {
              workingCapsule += '.rerelease';
              workingOptions.rerelease =
                relations.textWithTooltip.slots({
                  attributes: {class: 'rerelease'},
                  text: language.$(entryCapsule, 'rerelease.term'),
                  tooltip: slots.rereleaseTooltip,
                });
            } else if (!html.isBlank(slots.firstReleaseTooltip)) {
              workingCapsule += '.firstRelease';
              workingOptions.firstRelease =
                relations.textWithTooltip.slots({
                  attributes: {class: 'first-release'},
                  text: language.$(entryCapsule, 'firstRelease.term'),
                  tooltip: slots.firstReleaseTooltip,
                });
            } else if (!empty(slots.otherArtistLinks)) {
              workingCapsule += '.withArtists';
              workingOptions.artists =
                language.formatConjunctionList(slots.otherArtistLinks);
            }

            if (!html.isBlank(slots.annotation)) {
              workingCapsule += '.withAnnotation';
              workingOptions.annotation = slots.annotation;
            }

            if (workingCapsule === entryCapsule) {
              return slots.content;
            } else {
              return language.$(workingCapsule, workingOptions);
            }
          }),

          html.tag('span', {class: 'origin-details'},
            {[html.onlyIfContent]: true},

            slots.originDetails),
        ]))),
};
