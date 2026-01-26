import {V} from '#composite';
import Thing from '#thing';

import {exitWithoutDependency, exposeConstant} from '#composite/control-flow';
import {contentString} from '#composite/wiki-properties';

import {hasAnnotationPart} from '#composite/things/content';

import {ContentEntry} from './ContentEntry.js';

export class LyricsEntry extends ContentEntry {
  static [Thing.wikiData] = 'lyricsData';

  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    originDetails: contentString(),

    // Expose only

    isLyricsEntry: exposeConstant(V(true)),

    isWikiLyrics: hasAnnotationPart(V('wiki lyrics')),
    helpNeeded: hasAnnotationPart(V('help needed')),

    hasSquareBracketAnnotations: [
      exitWithoutDependency('isWikiLyrics', V(false), V('falsy')),
      exitWithoutDependency('body', V(false)),

      {
        dependencies: ['body'],
        compute: ({body}) =>
          /\[.*\]/m.test(body),
      },
    ],
  });

  static [Thing.yamlDocumentSpec] = Thing.extendDocumentSpec(ContentEntry, {
    fields: {
      'Origin Details': {property: 'originDetails'},
    },
  });
}
