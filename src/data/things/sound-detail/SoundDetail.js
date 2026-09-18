import {V} from '#composite';
import Thing from '#thing';

import {exposeConstant} from '#composite/control-flow';
import {contentString, soupyFind, thing} from '#composite/wiki-properties';

export class SoundDetail extends Thing {
  static [Thing.wikiData] = 'soundDetailData';

  static [Thing.getPropertyDescriptors] = ({Track}) => ({
    // Update & expose

    track: thing(V(Track)),

    detail: contentString(),
    notes: contentString(),

    // Update only

    find: soupyFind(),

    // Expose only

    isSoundDetail: exposeConstant(V(true)),

    // Value is defined on subclasses
    kind: exposeConstant(V(null)),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Detail': {property: 'detail'},
      'Notes': {property: 'notes'},
    },
  };
}
