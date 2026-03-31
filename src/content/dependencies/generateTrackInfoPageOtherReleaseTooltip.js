import {compareKebabCase} from '#wiki-data';

export default {
  relations: (relation, otherTrack, _currentTrack) => ({
    tooltip:
      relation('generateTooltip'),

    colorStyle:
      relation('generateColorStyleAttribute', otherTrack.album.color),
  }),

  data: (otherTrack, currentTrack) => ({
    otherDate:
      otherTrack.date,

    currentDate:
      currentTrack.date,

    differentName:
      (compareKebabCase(otherTrack.name, currentTrack.name)
        ? null
        : otherTrack.name),

    onSingle:
      otherTrack.album.style === 'single',
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('releaseInfo.alsoReleased.tooltip', capsule =>
      relations.tooltip.slots({
        attributes: [
          {class: 'other-release-tooltip'},
          relations.colorStyle,
        ],

        contentAttributes: [
          {[html.joinChildren]:
            html.tag('span', {class: 'cute-break'})},
        ],

        content: [
          language.encapsulate(capsule, 'differentName', workingCapsule => {
            const workingOptions = {
              [language.onlyIfOptions]: ['name'],
              name: data.differentName,
            };

            if (data.onSingle) {
              workingCapsule += '.onSingle';
            }

            return language.$(workingCapsule, workingOptions);
          }),

          data.otherDate && data.currentDate &&
            html.tag('span', {class: 'when'},
              language.formatRelativeDate(data.otherDate, data.currentDate, {
                considerRoundingDays: true,
                approximate: true,
                absolute: false,
              })),
        ],
      })),
};
