import {input} from '#composite';
import Thing from '#thing';
import {isContributionList, isDate} from '#validators';
import {parseContributors} from '#yaml';

import {withRecontextualizedContributionList, withResolvedContribs}
  from '#composite/wiki-data';
import {referenceList, simpleString, soupyFind, thing}
  from '#composite/wiki-properties';

import {
  exposeDependency,
  exposeDependencyOrContinue,
  exposeUpdateValueOrContinue,
} from '#composite/control-flow';

import {withDate} from '#composite/things/artwork';

export class Artwork extends Thing {
  static [Thing.referenceType] = 'artwork';

  static [Thing.getPropertyDescriptors] = ({
    ArtTag,
    Contribution,
  }) => ({
    // Update & expose

    thing: thing(),

    artTags: referenceList({
      class: input.value(ArtTag),
      find: soupyFind.input('artTag'),
    }),

    artistContribsFromThingProperty: simpleString(),
    artistContribsArtistProperty: simpleString(),

    artistContribs: [
      withDate(),

      withResolvedContribs({
        from: input.updateValue({validate: isContributionList}),
        date: '#date',
        artistProperty: 'artistContribsArtistProperty',
      }),

      exposeDependencyOrContinue({
        dependency: '#resolvedContribs',
        mode: input.value('empty'),
      }),

      {
        dependencies: ['thing', 'artistContribsFromThingProperty'],
        compute: (continuation, {thing, artistContribsFromThingProperty}) =>
          (artistContribsFromThingProperty
            ? continuation({
                '#artistContribs':
                  thing[artistContribsFromThingProperty],
              })
            : continuation.exit(null)),
      },

      withRecontextualizedContributionList({
        list: '#artistContribs',
      }),

      exposeDependency({
        dependency: '#artistContribs',
      }),
    ],

    dateFromThingProperty: simpleString(),

    date: [
      withDate({
        from: input.updateValue({validate: isDate}),
      }),

      exposeDependency({dependency: '#date'}),
    ],

    // Update only

    find: soupyFind(),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Artists': {
        property: 'artistContribs',
        transform: parseContributors,
      },

      'Art Tags': {property: 'artTags'},
    },
  };
}
