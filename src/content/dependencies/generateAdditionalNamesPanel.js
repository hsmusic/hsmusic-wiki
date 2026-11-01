import {simpler} from '#sort';
import {empty} from '#sugar';

export default {
  query(thing) {
    const query = {};

    const {additionalNames, name: main} = thing;

    query.interestingAdditionalNames = [];
    query.concealedAdditionalNames = [];

    // Ultra todo: This logic miserably falls apart when additional names
    // are content text and include meaningful wiki links or HTML tags.
    // But kind of EVERYTHING falls apart then, so those additional
    // names really just need a "plain name" field (the default) plus
    // a "fancy" field (for transformContent presentation).

    eachAvailableName:
    for (const {name: available} of additionalNames) {
      if (simpler(main, available) !== null) {
        // This name is comparable with the main name, whether simpler or not.
        query.concealedAdditionalNames.push(available);
        continue eachAvailableName;
      }

      eachPresentName:
      for (const [index, present] of query.interestingAdditionalNames.entries()) {
        const result = simpler(present, available);
        if (result === present) {
          // This name is already meaningfully represented.
          query.concealedAdditionalNames.push(available);
          continue eachAvailableName;
        } else if (result === available) {
          // This name is a better representation than the current one.
          query.interestingAdditionalNames[index] = available;
          query.concealedAdditionalNames.push(present);
          continue eachAvailableName;
        } else {
          // No match, continue.
        }
      }

      query.interestingAdditionalNames.push(available);
    }

    const chopped =
      query.interestingAdditionalNames.splice(3, Infinity);

    query.concealedAdditionalNames.push(...chopped);

    return query;
  },

  relations: (relation, query, thing) => ({
    items:
      thing.additionalNames
        .map(entry => relation('generateAdditionalNamesPanelItem', entry)),

    interestingAdditionalNames:
      query.interestingAdditionalNames
        .map(text => relation('transformContent', text)),
  }),

  data: (query, thing) => ({
    interestingAdditionalNames:
      query.interestingAdditionalNames,

    numConcealedAdditionalNames:
      query.concealedAdditionalNames.length,

    numAdditionalNamesWithAnnotation:
      thing.additionalNames.filter(entry => entry.annotation).length,
  }),

  slots: {
    alwaysOpen: {
      type: 'boolean',
      default: false,
    },
  },

  generate(data, relations, slots, {html, language}) {
    if (empty(relations.items)) {
      return html.blank();
    }

    const capsule = language.encapsulate('misc.additionalNames.panel.title');

    const names =
      language.formatUnitList(
        relations.interestingAdditionalNames
          .map(name => html.tag('i', name.slot('mode', 'inline'))));

    if (data.numAdditionalNamesWithAnnotation === 0) {
      if (data.numConcealedAdditionalNames === 0) {
        const p =
          html.tag('p', {id: 'additional-names-panel'},
            language.$(capsule, 'all', {names}));

        return p;
      }
    }

    const content =
      html.tag('ul',
        relations.items
          .map(item => html.tag('li', item)));

    if (slots.alwaysOpen) {
      const p =
        html.tag('p', {id: 'additional-names-panel'},
          (empty(data.interestingAdditionalNames)
            ? html.tag('span', {class: 'when-open'},
                language.$(capsule, 'noNames.open'))
         : data.numConcealedAdditionalNames === 0
            ? html.tag('span', {class: 'when-open'},
                language.$(capsule, 'open'))
            : html.tag('span', {class: 'when-open'},
                language.$(capsule, 'open'))));

      return html.tags([p, content]);
    }

    const more =
      language.countMore(data.numConcealedAdditionalNames);

    const summary =
      html.tag('summary',
        (empty(data.interestingAdditionalNames)
          ? [
              html.tag('span', {class: 'when-open'},
                language.$(capsule, 'noNames.open')),

              html.tag('span', {class: 'when-collapsed'},
                language.$(capsule, 'noNames')),
            ]

       : data.numConcealedAdditionalNames === 0
          ? [
              html.tag('span', {class: 'when-open'},
                language.$(capsule, 'open')),

              html.tag('span', {class: 'when-collapsed'},
                language.$(capsule, {names})),
            ]

          : [
              html.tag('span', {class: 'when-open'},
                language.$(capsule, 'open')),

              html.tag('span', {class: 'when-collapsed'},
                language.$(capsule, 'withMore', {names, more})),
            ]));

    const details =
      html.tag('details', {id: 'additional-names-panel'},
        {class: 'memorable'},
        {'data-memorable-id': 'additional-names'},

        summary,
        content);

    return details;
  },
};
