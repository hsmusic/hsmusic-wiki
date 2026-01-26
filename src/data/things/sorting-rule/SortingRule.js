import {V} from '#composite';
import {unique} from '#sugar';
import Thing from '#thing';
import {isStringNonEmpty} from '#validators';

import {exposeConstant} from '#composite/control-flow';
import {flag} from '#composite/wiki-properties';

export class SortingRule extends Thing {
  static [Thing.friendlyName] = `Sorting Rule`;
  static [Thing.wikiData] = 'sortingRules';

  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    active: flag(V(true)),

    message: {
      flags: {update: true, expose: true},
      update: {validate: isStringNonEmpty},
    },

    // Expose only

    isSortingRule: exposeConstant(V(true)),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Message': {property: 'message'},
      'Active': {property: 'active'},
    },
  };

  check(opts) {
    return this.constructor.check(this, opts);
  }

  apply(opts) {
    return this.constructor.apply(this, opts);
  }

  static check(rule, opts) {
    const result = this.apply(rule, {...opts, dry: true});
    if (!result) return true;
    if (!result.changed) return true;
    return false;
  }

  static async apply(_rule, _opts) {
    throw new Error(`Not implemented`);
  }

  static async* applyAll(_rules, _opts) {
    throw new Error(`Not implemented`);
  }

  static async* go({dataPath, wikiData, dry}) {
    const rules = wikiData.sortingRules;
    const constructors = unique(rules.map(rule => rule.constructor));

    for (const constructor of constructors) {
      yield* constructor.applyAll(
        rules
          .filter(rule => rule.active)
          .filter(rule => rule.constructor === constructor),
        {dataPath, wikiData, dry});
    }
  }
}
