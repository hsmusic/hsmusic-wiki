import * as path from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspect} from 'node:util';

import chroma from 'chroma-js';

import {getColors} from '#colors';
import {quickLoadContentDependencies} from '#content-dependencies';
import {quickEvaluate} from '#content-function';
import * as html from '#html';
import {internalDefaultStringsFile, processLanguageFile} from '#language';
import {empty, showAggregate} from '#sugar';
import {generateURLs, thumb, urlSpec} from '#urls';

import mock from './generic-mock.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function testContentFunctions(t, message, fn) {
  const urls = generateURLs(urlSpec);

  t.test(message, async t => {
    let loadedContentDependencies;

    const language = await processLanguageFile(internalDefaultStringsFile);
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

    evaluate.stubTemplate = name =>
      // Creates a particularly permissable template, allowing any slot values
      // to be stored and just outputting the contents of those slots as-are.
      _stubTemplate(name, false);

    evaluate.stubContentFunction = name =>
      // Like stubTemplate, but instead of a template directly, returns
      // an object describing a content function - suitable for passing
      // into evaluate.mock.
      _stubTemplate(name, true);

    const _stubTemplate = (name, mockContentFunction) => {
      const inspectNicely = (value, opts = {}) =>
        inspect(value, {
          ...opts,
          colors: false,
          sort: true,
        });

      const makeTemplate = formatContentFn =>
        new (class extends html.Template {
          #slotValues = {};

          constructor() {
            super({
              content: () => this.#getContent(formatContentFn),
            });
          }

          setSlots(slotNamesToValues) {
            Object.assign(this.#slotValues, slotNamesToValues);
          }

          setSlot(slotName, slotValue) {
            this.#slotValues[slotName] = slotValue;
          }

          #getContent(formatContentFn) {
            const toInspect =
              Object.fromEntries(
                Object.entries(this.#slotValues)
                  .filter(([key, value]) => value !== null));

            const inspected =
              inspectNicely(toInspect, {
                breakLength: Infinity,
                compact: true,
                depth: Infinity,
              });

            return formatContentFn(inspected); `${name}: ${inspected}`;
          }
        });

      if (mockContentFunction) {
        return {
          data: (...args) => ({args}),
          generate: (data) =>
            makeTemplate(slots => {
              const argsLines =
                (empty(data.args)
                  ? []
                  : inspectNicely(data.args, {depth: Infinity})
                      .split('\n'));

              return (`[mocked: ${name}` +

                (empty(data.args)
                  ? ``
               : argsLines.length === 1
                  ? `\n args: ${argsLines[0]}`
                  : `\n args: ${argsLines[0]}\n` +
                    argsLines.slice(1).join('\n').replace(/^/gm, ' ')) +

                (!empty(data.args)
                  ? `\n `
                  : ` - `) +

                (slots
                  ? `slots: ${slots}]`
                  : `slots: none]`));
            }),
        };
      } else {
        return makeTemplate(slots => `${name}: ${slots}`);
      }
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
