import {empty} from '#sugar';

export default {
  contentDependencies: ['generateAdditionalNamesBox'],
  extraDependencies: ['html'],

  query: (track) => {
    const {
      additionalNames: own,
      sharedAdditionalNames: shared,
      inferredAdditionalNames: inferred,
    } = track;

    if (empty(own) && empty(shared) && empty(inferred)) {
      return {combinedList: []};
    }

    const firstFilter =
      (empty(own)
        ? new Set()
        : new Set(own.map(({name}) => name)));

    const sharedFiltered =
      shared.filter(({name}) => !firstFilter.has(name))

    const secondFilter =
      new Set([
        ...firstFilter,
        ...sharedFiltered.map(({name}) => name),
      ]);

    const inferredFiltered =
      inferred.filter(({name}) => !secondFilter.has(name));

    return {
      combinedList: [
        ...own,
        ...sharedFiltered,
        ...inferredFiltered,
      ],
    };
  },

  relations: (relation, query) => ({
    box:
      (empty(query.combinedList)
        ? null
        : relation('generateAdditionalNamesBox', query.combinedList)),
  }),

  generate: (relations, {html}) =>
    relations.box ?? html.blank(),
};
