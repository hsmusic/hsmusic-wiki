import {input, V} from '#composite';
import Thing from '#thing';
import {parseDate} from '#yaml';

import {withIndexInList, withNearbyItemFromList, withPropertyFromList}
  from '#composite/data';

import {
  contentString,
  directory,
  flag,
  name,
  simpleDate,
  simpleString,
  singleReference,
  soupyFind,
  thingList,
} from '#composite/wiki-properties';

import {
  exitWithoutDependency,
  exposeConstant,
  exposeDependency,
  exposeWhetherDependencyAvailable,
} from '#composite/control-flow';

export class WikiUpdate extends Thing {
  static [Thing.friendlyName] = `Wiki Update`;
  static [Thing.wikiData] = 'wikiUpdateData';

  static [Thing.getPropertyDescriptors] = ({WikiUpdateSection}) => ({
    // Update & expose

    name: name(V(`Unnamed Wiki Update`)),

    newsEntry: singleReference({
      find: soupyFind.input('newsEntry'),
    }),

    nameHTML: simpleString(),

    isMainUpdate: flag(V(false)),
    isStubUpdate: flag(V(false)),

    directory: directory({name: 'isoDate'}),
    date: simpleDate(),

    changes: contentString(),

    sections: thingList(V(WikiUpdateSection)),

    // Update only

    find: soupyFind(),
    wikiUpdateData: thingList(V(WikiUpdate)),

    // Expose only

    isWikiUpdate: exposeConstant(V(true)),

    isRegularUpdate:
      exposeWhetherDependencyAvailable({
        dependency: 'isMainUpdate',
        mode: input.value('falsy'),
        negate: input.value(true),
      }),

    isoDate: [
      exitWithoutDependency('date'),

      {
        dependencies: ['date'],
        compute: ({date}) =>
          date.toISOString()
            .slice(0, '2019-11-15'.length),
      },
    ],

    isLatestMainUpdate:
      exposeWhetherDependencyAvailable({
        dependency: 'nextMainUpdate',
        negate: input.value(true),
      }),

    // The offsets for these next properties are flipped from normal,
    // because wikiUpdateData is sorted latest-first.

    nextUpdate: [
      withNearbyItemFromList({
        list: '_wikiUpdateData',
        item: input.myself(),
        offset: input.value(-1),
      }),

      exposeDependency('#nearbyItem'),
    ],

    previousUpdate: [
      withNearbyItemFromList({
        list: '_wikiUpdateData',
        item: input.myself(),
        offset: input.value(+1),
      }),

      exposeDependency('#nearbyItem'),
    ],

    nextMainUpdate: [
      exitWithoutDependency('isMainUpdate', V(null), V('falsy')),
      withPropertyFromList('_wikiUpdateData', V('isMainUpdate')),

      withNearbyItemFromList({
        list: '_wikiUpdateData',
        item: input.myself(),
        offset: input.value(-1),
        filter: '#wikiUpdateData.isMainUpdate',
      }),

      exposeDependency('#nearbyItem'),
    ],

    previousMainUpdate: [
      exitWithoutDependency('isMainUpdate', V(null), V('falsy')),
      withPropertyFromList('_wikiUpdateData', V('isMainUpdate')),

      withNearbyItemFromList({
        list: '_wikiUpdateData',
        item: input.myself(),
        offset: input.value(+1),
        filter: '#wikiUpdateData.isMainUpdate',
      }),

      exposeDependency('#nearbyItem'),
    ],

    subsequentRegularUpdates: [
      exitWithoutDependency('isMainUpdate', V([]), V('falsy')),

      withIndexInList('_wikiUpdateData', input.myself())
        .outputs({'#index': '#ownIndex'}),

      {
        dependencies: ['isLatestMainUpdate', '_wikiUpdateData', '#ownIndex'],
        compute: (continuation, {
          ['isLatestMainUpdate']: isLatestMainUpdate,
          ['_wikiUpdateData']: wikiUpdateData,
          ['#ownIndex']: ownIndex,
        }) =>
          (isLatestMainUpdate
            ? wikiUpdateData.slice(0, ownIndex)
            : continuation()),
      },

      withIndexInList('_wikiUpdateData', 'nextMainUpdate')
        .outputs({'#index': '#nextMainUpdateIndex'}),

      {
        dependencies: ['_wikiUpdateData', '#ownIndex', '#nextMainUpdateIndex'],
        compute: ({
          ['_wikiUpdateData']: wikiUpdateData,
          ['#ownIndex']: ownIndex,
          ['#nextMainUpdateIndex']: nextMainUpdateIndex,
        }) =>
          wikiUpdateData.slice(nextMainUpdateIndex + 1, ownIndex),
      },
    ],

    mainUpdate: [
      exitWithoutDependency('isRegularUpdate', V(null), V('falsy')),

      withPropertyFromList('_wikiUpdateData', V('isMainUpdate')),

      withNearbyItemFromList({
        list: '_wikiUpdateData',
        item: input.myself(),
        offset: input.value(+1),
        filter: '#wikiUpdateData.isMainUpdate',
      }),

      exposeDependency('#nearbyItem'),
    ],
  });

  static [Thing.findSpecs] = {
    wikiUpdate: {
      referenceTypes: ['update'],
      bindTo: 'wikiUpdateData',
    },
  };

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Wiki Update': {property: 'name'},
      'News Entry': {property: 'newsEntry'},
      'Name HTML': {property: 'nameHTML'},

      'Main Update': {property: 'isMainUpdate'},
      'Stub Update': {property: 'isStubUpdate'},

      'Directory': {property: 'directory'},
      'Date': {property: 'date', transform: parseDate},

      'Changes': {property: 'changes'},
    },
  };
}
