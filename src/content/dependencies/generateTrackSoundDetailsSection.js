export default {
  relations: (relation, track) => ({
    contentHeading:
      relation('generateContentHeading'),

    externalLink:
      relation('linkExternal', {
        url:
          'https://docs.google.com/spreadsheets/d/' +
          '1i3hKfU_IZpFywLQ-gy2BElltD7l9G3YkV6ga1x9uFuk/edit?usp=sharing',
      }),

    soundDetailRows:
      track.soundDetails
        .map(detail => relation('generateSoundDetailRow', detail)),
  }),

  data: (track) => ({
    name:
      track.name,

    nameStyle:
      track.nameStyle,

    numRows:
      track.soundDetails.length,
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('misc.soundDetails', capsule =>
      html.tag('details', {class: 'sound-details'},
        {class: 'memorable', 'data-memorable-id': 'sound-details'},
        {[html.onlyIfContent]: true},

        relations.contentHeading.slots({
          tag: 'summary',

          title:
            language.encapsulate(capsule, workingCapsule => {
              const workingOptions = {};

              workingOptions.cue =
                html.tag('span', {class: 'cue'},
                  language.$(capsule, 'cue'));

              if (data.numRows >= 1) {
                workingCapsule += '.withRowCount';
                workingOptions.rows =
                  language.countSoundDetailRows(data.numRows, {unit: true});
              }

              const name =
                (data.nameStyle === 'utility' ||
                 data.nameStyle === 'unofficial' ||
                 data.nameStyle === 'unofficial localization'
                  ? null
                  : data.name);

              if (name) {
                workingOptions.thing = html.tag('i', name);
              } else {
                workingCapsule += '.withoutName';
              }

              return html.tags([
                html.tag('span', {class: 'when-open'},
                  language.$(workingCapsule, workingOptions)),

                html.tag('span', {class: 'when-collapsed'},
                  language.$(workingCapsule, 'collapsed', workingOptions)),
              ]);
            }),
        }),

        html.tag('p', {class: 'info'},
          {[html.onlyIfSiblings]: true},

          language.$(capsule, 'info.contribute', {
            link:
              relations.externalLink.slots({
                indicateExternal: true,
                tab: 'separate',
                content: language.$(capsule, 'info.contribute.link'),
              }),
          })),

        html.tag('ul', {[html.onlyIfContent]: true},
          relations.soundDetailRows))),
};
