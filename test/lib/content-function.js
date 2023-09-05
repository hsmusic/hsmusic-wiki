import * as path from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspect} from 'node:util';

import chroma from 'chroma-js';

import {getColors} from '#colors';
import {quickLoadContentDependencies} from '#content-dependencies';
import {quickEvaluate} from '#content-function';
import * as html from '#html';
import {processLanguageFile} from '#language';
import {empty, showAggregate} from '#sugar';
import {generateURLs, thumb, urlSpec} from '#urls';

import mock from './generic-mock.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function testContentFunctions(t, message, fn) {
  const urls = generateURLs(urlSpec);

  t.test(message, async t => {
    let loadedContentDependencies;

    const language = await processLanguageFile('./src/strings-default.json');
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
            language,
            thumb,
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
        quickLoadContentDependencies({
          logging: false,
          ...opts,
        }));
    };

    evaluate.snapshot = (...args) => {
      if (!loadedContentDependencies) {
        throw new Error(`Await .load() before performing tests`);
      }

      const [description, opts] =
        (typeof args[0] === 'string'
          ? args
          : ['output', ...args]);

      let result = evaluate(opts);

      if (opts.multiple) {
        result = result.map(item => item.toString()).join('\n');
      } else {
        result = result.toString();
      }

      t.matchSnapshot(result, description);
    };

    evaluate.stubTemplate = name => {
      // Creates a particularly permissable template, allowing any slot values
      // to be stored and just outputting the contents of those slots as-are.

      return new (class extends html.Template {
        #slotValues = {};

        constructor() {
          super({
            content: () => this.#getContent(this),
          });
        }

        setSlots(slotNamesToValues) {
          Object.assign(this.#slotValues, slotNamesToValues);
        }

        setSlot(slotName, slotValue) {
          this.#slotValues[slotName] = slotValue;
        }

        #getContent() {
          const toInspect =
            Object.fromEntries(
              Object.entries(this.#slotValues)
                .filter(([key, value]) => value !== null));

          const inspected =
            inspect(toInspect, {
              breakLength: Infinity,
              colors: false,
              compact: true,
              depth: Infinity,
              sort: true,
            });

          return `${name}: ${inspected}`;
        }
      });
    };

    evaluate.mock = (...opts) => {
      const {value, close} = mock(...opts);
      mocks.push({close});
      return value;
    };

    evaluate.mock.transformContent = {
      transformContent: {
        extraDependencies: ['html'],
        data: content => ({content}),
        slots: {mode: {type: 'string'}},
        generate: ({content}) => content,
      },
    };

    await fn(t, evaluate);

    if (!empty(mocks)) {
      cleanCatchAggregate(() => {
        const errors = [];
        for (const {close} of mocks) {
          try {
            close();
          } catch (error) {
            errors.push(error);
          }
        }
        if (!empty(errors)) {
          throw new AggregateError(errors, `Errors closing mocks`);
        }
      });
    }
  });
}

function printAggregate(error) {
  if (error instanceof AggregateError) {
    const message = showAggregate(error, {
      showTraces: true,
      print: false,
      pathToFileURL: f => path.relative(path.join(__dirname, '../..'), fileURLToPath(f)),
    });
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
