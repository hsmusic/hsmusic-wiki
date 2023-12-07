import {empty, stitchArrays} from '#sugar';

import {
  chunkByConditions,
  compareDates,
  filterMultipleArrays,
  sortMultipleArrays,
} from '#wiki-data';

export default {
  contentDependencies: ['generateSectionedList'],
  extraDependencies: ['html', 'language'],

  relations: (relation) =>
    ({sectionedList: relation('generateSectionedList')}),

  slots: {
    string: {
      validate: v => v.is('generic', 'album', 'track'),
      default: 'generic',
    },

    division: {
      validate: v => v.is('year', 'month', 'date'),
      default: 'year',
    },

    itemDates: {
      validate: v => v.strictArrayOf(v.optional(v.isDate)),
    },

    itemDatetimestamps: {
      validate: v => v.strictArrayOf(v.isHTML),
    },

    itemTitles: {
      validate: v => v.strictArrayOf(v.isHTML),
    },

    collapseSections: {
      validate: v => v.is('bar', 'invisible'),
    },
  },

  generate: (relations, slots, {language}) => {
    const sectionPrefix = 'misc.chronologicalList.section';
    const itemPrefix = 'misc.chronologicalList.item';

    const filteredItemDates = slots.itemDates.slice();

    const filteredItemDatetimestamps =
      (slots.itemDatetimestamps
        ? slots.itemDatetimestamps.slice()
        : Array.from({length: slots.itemDates}, () => null));

    const filteredItemTitles = slots.itemTitles.slice();

    const {removed: [,, datelessItemTitles]} =
      filterMultipleArrays(
        filteredItemDates,
        filteredItemDatetimestamps,
        filteredItemTitles,
        date => date);

    sortMultipleArrays(
      filteredItemDates,
      filteredItemDatetimestamps,
      filteredItemTitles,
      (date1, date2) =>
        compareDates(date1, date2));

    const dateChunks =
      chunkByConditions(filteredItemDates, [
        slots.division === 'date' &&
          ((date1, date2) => +date1 !== +date2),
        slots.division === 'month' &&
          ((date1, date2) => date1.getMonth() !== date2.getMonth()),
        slots.division !== 'date' &&
          ((date1, date2) => date1.getFullYear() !== date2.getFullYear()),
      ].filter(Boolean));

    const dateSectionItemIndices =
      dateChunks.reduce((accumulator, chunk) => {
        const startIndex =
          (empty(accumulator)
            ? 0
            : accumulator.at(-1).at(-1) + 1);

        return [
          ...accumulator,
          Array.from({length: chunk.length},
            (_item, index) => startIndex + index),
        ];
      }, []);

    const dateSectionTimeframes =
      dateChunks.map(([firstDate]) =>
        (slots.division === 'year'
          ? language.$('misc.timeframe.year', {
              year: firstDate.getFullYear(),
            })
       : slots.division === 'month'
          ? language.$('misc.timeframe.month', {
              month: language.formatMonth(firstDate.getMonth()),
            })
          : language.$('misc.timeframe.date', {
              date: language.formatDate(firstDate),
            })));

    const dateSectionTitles =
      dateSectionTimeframes
        .map(timeframe =>
          language.$(sectionPrefix, slots.string, 'withTimeframe', {
            timeframe,
          }));

    const dateSectionItems =
      dateSectionItemIndices.map(indices =>
        stitchArrays({
          title:
            Array.from(indices, index => filteredItemTitles[index]),
          datetimestamp:
            Array.from(indices, index => filteredItemDatetimestamps[index]),
        }).map(({title, datetimestamp}) =>
            (datetimestamp
              ? language.$(itemPrefix, 'withDate', {title, date: datetimestamp})
              : language.$(itemPrefix, {title}))));

    const datelessSectionTitle =
      (empty(datelessItemTitles)
        ? null
        : language.$('misc.chronologicalList.section', slots.string, 'dateless'));

    const datelessSectionItems =
      datelessItemTitles;

    return relations.sectionedList.slots({
      class: [
        'chronological-list',
        slots.string !== 'generic' &&
          `chronological-${slots.string}-list`,
      ],

      sectionTitles:
        (datelessSectionTitle
          ? [...dateSectionTitles, datelessSectionTitle]
          : [...dateSectionTitles]),

      sectionItems:
        (datelessSectionTitle
          ? [...dateSectionItems, datelessSectionItems]
          : [...dateSectionItems]),

      collapseSections: slots.collapseSections,
    });
  },
};
