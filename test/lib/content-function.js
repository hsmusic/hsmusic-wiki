import {quickEvaluate} from '../../src/content-function.js';
import {quickLoadContentDependencies} from '../../src/content/dependencies/index.js';

import chroma from 'chroma-js';
import * as html from '../../src/util/html.js';
import urlSpec from '../../src/url-spec.js';
import {getColors} from '../../src/util/colors.js';
import {generateURLs} from '../../src/util/urls.js';

import mock from './generic-mock.js';

export function testContentFunctions(t, message, fn) {
  const urls = generateURLs(urlSpec);

  t.test(message, async t => {
    let loadedContentDependencies;

    const mocks = [];

    const evaluate = ({
      from = 'localized.home',
      contentDependencies = {},
      extraDependencies = {},
      ...opts
    }) => {
      if (!loadedContentDependencies) {
        throw new Error(`Await .load() before performing tests`);
      }

      const {to} = urls.from(from);

      return cleanCatchAggregate(() => {
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
      });
    };

    evaluate.load = async (opts) => {
      if (loadedContentDependencies) {
        throw new Error(`Already loaded!`);
      }

      loadedContentDependencies = await asyncCleanCatchAggregate(() =>
        quickLoadContentDependencies(opts));
    };

    evaluate.snapshot = (opts, fn) => {
      if (!loadedContentDependencies) {
        throw new Error(`Await .load() before performing tests`);
      }

      const result = (fn ? fn(evaluate(opts)) : evaluate(opts));
      t.matchSnapshot(result.toString(), 'output');
    };

    evaluate.mock = (...opts) => {
      const {value, close} = mock(...opts);
      mocks.push({close});
      return value;
    };

    await fn(t, evaluate);

    if (mocks.length) {
      cleanCatchAggregate(() => {
        const errors = [];
        for (const {close} of mocks) {
          try {
            close();
          } catch (error) {
            errors.push(error);
          }
        }
        if (errors.length) {
          throw new AggregateError(errors, `Errors closing mocks`);
        }
      });
    }
  });
}

function cleanAggregate(error) {
  if (error instanceof AggregateError) {
    return new Error(`[AggregateError: ${error.message}\n${
      error.errors
        .map(cleanAggregate)
        .map(err => ` * ${err.message.split('\n').map((l, i) => (i > 0 ? '   ' + l : l)).join('\n')}`)
        .join('\n')}]`);
  } else {
    return error;
  }
}

function printAggregate(error) {
  if (error instanceof AggregateError) {
    const {message} = cleanAggregate(error);
    for (const line of message.split('\n')) {
      console.error(line);
    }
  }
}

function cleanCatchAggregate(fn) {
  try {
    return fn();
  } catch (error) {
    printAggregate(error);
    throw error;
  }
}

async function asyncCleanCatchAggregate(fn) {
  try {
    return await fn();
  } catch (error) {
    printAggregate(error);
    throw error;
  }
}
