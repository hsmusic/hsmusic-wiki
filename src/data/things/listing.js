import {inspect} from 'node:util';

import {input} from '#composite';
import Thing from '#thing';
import {isStringNonEmpty} from '#validators';

import {exitWithoutDependency} from '#composite/control-flow';
import {wikiData} from '#composite/wiki-properties';

import {
  listingDirectory,
  listingScope,
  listingTarget,
  seeAlsoListings,
  withSameScopeListings,
} from '#composite/things/listing';

export class Listing extends Thing {
  static [Thing.referenceType] = 'listing';

  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    scope: listingScope(),
    directory: listingDirectory(),
    target: listingTarget(),

    featureFlag: {
      flags: {update: true, expose: true},
      update: {validate: isStringNonEmpty},
    },

    stringsKey: {
      flags: {update: true, expose: true},

      update: {
        validate: isStringNonEmpty,
      },

      expose: {
        dependencies: ['scope', 'directory'],
        transform(stringsKey, {scope, directory}) {
          const parts = ['listingPage'];

          if (scope === 'wiki') {
            if (directory === 'index') {
              parts.push('wiki');
            }
          } else {
            parts.push(scope);
          }

          parts.push(stringsKey);

          return parts.join('.');
        },
      }
    },

    contentFunction: {
      flags: {update: true, expose: true},
      update: {validate: isStringNonEmpty},
    },

    seeAlsoListings: seeAlsoListings(),

    // Update only

    listingData: wikiData({
      class: input.value(Listing),
    }),

    // Expose only

    data: {
      flags: {expose: true},
      expose: {
        dependencies: ['this'],
        compute: ({this: myself}) => {
          console.warn(`${inspect(myself)} - "data" not implemented yet`);
          return [];
        },
      },
    },

    indexListing: [
      {
        dependencies: ['directory'],
        compute: (continuation, {
          ['directory']: directory,
        }) => continuation({
          ['#isIndex']: directory === 'index',
        }),
      },

      {
        dependencies: ['#isIndex', input.myself()],
        compute: (continuation, {
          ['#isIndex']: isIndex,
          [input.myself()]: myself,
        }) =>
          (isIndex
            ? myself
            : continuation()),
      },

      exitWithoutDependency({
        dependency: 'listingData',
      }),

      exitWithoutDependency({
        dependency: 'scope',
      }),

      {
        dependencies: ['listingData', 'scope'],
        compute: ({
          ['listingData']: listingData,
          ['scope']: scope,
        }) =>
          listingData.find(listing =>
            listing.scope === scope &&
            listing.directory === 'index'),
      },
    ],

    sameTargetListings: [
      exitWithoutDependency({
        dependency: 'target',
      }),

      withSameScopeListings(),

      {
        dependencies: ['#sameScopeListings', 'target'],
        compute: ({
          ['#sameScopeListings']: sameScopeListings,
          ['target']: target,
        }) =>
          sameScopeListings.filter(listing =>
            listing.target === target),
      },
    ],
  });

  static [Thing.findSpecs] = {
    listing: {
      referenceTypes: ['listing'],
      bindTo: 'listingData',

      getMatchableNames: _listing => [],

      getMatchableDirectories: listing => {
        const directories = [`${listing.scope}/${listing.directory}`];

        if (listing.scope === 'wiki') {
          directories.push(listing.directory);
        }

        return directories;
      },
    },
  };
}
