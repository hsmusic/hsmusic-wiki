import {quickEvaluate} from '../../src/content-function.js';
import {quickLoadContentDependencies} from '../../src/content/dependencies/index.js';

import chroma from 'chroma-js';
import * as html from '../../src/util/html.js';
import urlSpec from '../../src/url-spec.js';
import {getColors} from '../../src/util/colors.js';
import {generateURLs} from '../../src/util/urls.js';

export function testContentFunctions(t, message, fn) {
  const urls = generateURLs(urlSpec);

  t.test(message, async t => {
    const loadedContentDependencies = await quickLoadContentDependencies();

    const evaluate = ({
      from = 'localized.home',
      contentDependencies = {},
      extraDependencies = {},
      ...opts
    }) => {
      const {to} = urls.from(from);

      try {
        return quickEvaluate({
          ...opts,
          contentDependencies: {
            ...contentDependencies,
            ...loadedContentDependencies,
          },
          extraDependencies: {
            html,
            to,
            urls,
            appendIndexHTML: false,
            getColors: c => getColors(c, {chroma}),
            ...extraDependencies,
          },
        });
      } catch (error) {
        if (error instanceof AggregateError) {
          error = new Error(`AggregateError: ${error.message}\n${error.errors.map(err => `** ${err}`).join('\n')}`);
        }
        throw error;
      }
    };

    evaluate.snapshot = (opts, fn) => {
      const result = (fn ? fn(evaluate(opts)) : evaluate(opts));
      t.matchSnapshot(result.toString(), 'output');
    };

    return fn(t, evaluate);
  });
}
