import {inspect} from 'node:util';

import {colors} from '#cli';
import {input, V} from '#composite';
import find from '#find';
import Thing from '#thing';
import {is} from '#validators';
import {combineWikiDataArrays} from '#wiki-data';

import {exitWithoutUpdateValue} from '#composite/control-flow';
import {contentString, name, referenceList, soupyFind, thing, wikiData}
  from '#composite/wiki-properties';

export class Series extends Thing {
  static [Thing.wikiData] = 'seriesData';

  static [Thing.getPropertyDescriptors] = ({Album, Group, Track}) => ({
    // Update & expose

    group: thing(V(Group)),

    name: name(V('Unnamed Series')),
    description: contentString(),

    showArtists: {
      flags: {update: true, expose: true},
      update: {
        validate:
          is('all', 'differing', 'none'),
      },
    },

    things: [
      {
        dependencies: ['_albumData', '_trackData'],

        compute: (continuation, {
          ['_albumData']: albumData,
          ['_trackData']: trackData,
        }) => continuation({
          ['#find']:
            find.mixed({
              prioritize: ['album'],
              album: find.album,
              track: find.track,
            }),

          ['#data']:
            combineWikiDataArrays([albumData, trackData]),
        }),
      },

      referenceList({
        referenceType: input.value(['album', 'track']),
        data: '#data',
        find: '#find',
      }),
    ],

    // Update only

    find: soupyFind(),

    albumData: wikiData(V(Album)),
    trackData: wikiData(V(Track)),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Name': {property: 'name'},
      'Description': {property: 'description'},

      // Truly terrifying field aliases sorry

      'Show Album Artists': {property: 'showArtists'},
      'Show Artists': {property: 'showArtists'},

      'Albums': {property: 'things'},
      'Items': {property: 'things'},
    },

    invalidFieldCombinations: [
      {message: `Use just Items field`, fields: ['Albums', 'Items']},
      {message: `Use just Show Artists field`, fields: [
        'Show Album Artists',
        'Show Artists']},
    ],
  };

  [inspect.custom](depth, options, inspect) {
    const parts = [];

    parts.push(Thing.prototype[inspect.custom].apply(this));

    if (depth >= 0) showGroup: {
      let group = null;
      try {
        group = this.group;
      } catch {
        break showGroup;
      }

      const groupName = group.name;
      const groupIndex = group.serieses.indexOf(this);

      const num =
        (groupIndex === -1
          ? 'indeterminate position'
          : `#${groupIndex + 1}`);

      parts.push(` (${colors.yellow(num)} in ${colors.green(`"${groupName}"`)})`);
    }

    return parts.join('');
  }
}
