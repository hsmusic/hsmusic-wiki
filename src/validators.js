import {inspect as nodeInspect} from 'node:util';

import {openAggregate, withAggregate} from '#aggregate';
import {colors, ENABLE_COLOR} from '#cli';
import {cut, empty, matchMultiline, typeAppearance} from '#sugar';
import {commentaryRegexCaseInsensitive, commentaryRegexCaseSensitiveOneShot}
  from '#wiki-data';

function inspect(value) {
  return nodeInspect(value, {colors: ENABLE_COLOR});
}

export function getValidatorCreator(validator) {
  return validator[Symbol.for(`hsmusic.validator.creator`)] ?? null;
}

export function getValidatorCreatorMeta(validator) {
  return validator[Symbol.for(`hsmusic.validator.creatorMeta`)] ?? null;
}

export function setValidatorCreatorMeta(validator, creator, meta) {
  validator[Symbol.for(`hsmusic.validator.creator`)] = creator;
  validator[Symbol.for(`hsmusic.validator.creatorMeta`)] = meta;
  return validator;
}

// Basic types (primitives)

export function a(noun) {
  return /[aeiou]/.test(noun[0]) ? `an ${noun}` : `a ${noun}`;
}

export function validateType(type) {
  const fn = value => {
    if (typeof value !== type)
      throw new TypeError(`Expected ${a(type)}, got ${typeAppearance(value)}`);

    return true;
  };

  setValidatorCreatorMeta(fn, validateType, {type});

  return fn;
}

export const isBoolean =
  validateType('boolean');

export const isFunction =
  validateType('function');

export const isNumber =
  validateType('number');

export const isString =
  validateType('string');

export const isSymbol =
  validateType('symbol');

// Use isObject instead, which disallows null.
export const isTypeofObject =
  validateType('object');

export function isPositive(number) {
  isNumber(number);

  if (number <= 0) throw new TypeError(`Expected positive number`);

  return true;
}

export function isNegative(number) {
  isNumber(number);

  if (number >= 0) throw new TypeError(`Expected negative number`);

  return true;
}

export function isPositiveOrZero(number) {
  isNumber(number);

  if (number < 0) throw new TypeError(`Expected positive number or zero`);

  return true;
}

export function isNegativeOrZero(number) {
  isNumber(number);

  if (number > 0) throw new TypeError(`Expected negative number or zero`);

  return true;
}

export function isInteger(number) {
  isNumber(number);

  if (number % 1 !== 0) throw new TypeError(`Expected integer`);

  return true;
}

export function isCountingNumber(number) {
  isInteger(number);
  isPositive(number);

  return true;
}

export function isWholeNumber(number) {
  isInteger(number);
  isPositiveOrZero(number);

  return true;
}

export function isStringNonEmpty(value) {
  isString(value);

  if (value.trim().length === 0)
    throw new TypeError(`Expected non-empty string`);

  return true;
}

export function optional(validator) {
  return value =>
    value === null ||
    value === undefined ||
    validator(value);
}

// Complex types (non-primitives)

export function isInstance(value, constructor) {
  isObject(value);

  if (!(value instanceof constructor))
    throw new TypeError(`Expected ${constructor.name}, got ${value.constructor.name}`);

  return true;
}

export function isDate(value) {
  isInstance(value, Date);

  if (isNaN(value))
    throw new TypeError(`Expected valid date`);

  return true;
}

export function isObject(value) {
  isTypeofObject(value);

  // Note: Please remember that null is always a valid value for properties
  // held by a CacheableObject. This assertion is exclusively for use in other
  // contexts.
  if (value === null)
    throw new TypeError(`Expected an object, got null`);

  return true;
}

export function isArray(value) {
  if (typeof value !== 'object' || value === null || !Array.isArray(value))
    throw new TypeError(`Expected an array, got ${typeAppearance(value)}`);

  return true;
}

// This one's shaped a bit different from other "is" functions.
// More like validate functions, it returns a function.
export function is(...values) {
  if (Array.isArray(values)) {
    values = new Set(values);
  }

  if (values.size === 1) {
    const expected = Array.from(values)[0];

    return (value) => {
      if (value !== expected) {
        throw new TypeError(`Expected ${expected}, got ${value}`);
      }

      return true;
    };
  }

  const fn = (value) => {
    if (!values.has(value)) {
      throw new TypeError(`Expected one of ${Array.from(values).join(' ')}, got ${value}`);
    }

    return true;
  };

  setValidatorCreatorMeta(fn, is, {values});

  return fn;
}

function validateArrayItemsHelper(itemValidator) {
  return (item, index, array) => {
    try {
      const value = itemValidator(item, index, array);

      if (value !== true) {
        throw new Error(`Expected validator to return true`);
      }
    } catch (caughtError) {
      const indexPart = colors.yellow(`zero-index ${index}`)
      const itemPart = inspect(item);
      const message = `Error at ${indexPart}: ${itemPart}`;
      const error = new Error(message, {cause: caughtError});
      error[Symbol.for('hsmusic.annotateError.indexInSourceArray')] = index;
      throw error;
    }
  };
}

export function validateArrayItems(itemValidator) {
  const helper = validateArrayItemsHelper(itemValidator);

  return (array) => {
    isArray(array);

    withAggregate({message: 'Errors validating array items'}, ({call}) => {
      for (let index = 0; index < array.length; index++) {
        call(helper, array[index], index, array);
      }
    });

    return true;
  };
}

export function strictArrayOf(itemValidator) {
  return validateArrayItems(itemValidator);
}

export function sparseArrayOf(itemValidator) {
  return validateArrayItems((item, index, array) => {
    if (item === false || item === null) {
      return true;
    }

    return itemValidator(item, index, array);
  });
}

export function looseArrayOf(itemValidator) {
  return validateArrayItems((item, index, array) => {
    if (item === false || item === null || item === undefined) {
      return true;
    }

    return itemValidator(item, index, array);
  });
}

export function validateInstanceOf(constructor) {
  const fn = (object) => isInstance(object, constructor);

  setValidatorCreatorMeta(fn, validateInstanceOf, {constructor});

  return fn;
}

// Wiki data (primitives & non-primitives)

export function isColor(color) {
  isStringNonEmpty(color);

  if (color.startsWith('#')) {
    if (![4, 5, 7, 9].includes(color.length))
      throw new TypeError(`Expected #rgb, #rgba, #rrggbb, or #rrggbbaa, got length ${color.length}`);

    if (/[^0-9a-fA-F]/.test(color.slice(1)))
      throw new TypeError(`Expected hexadecimal digits`);

    return true;
  }

  throw new TypeError(`Unknown color format`);
}

export function isCommentary(commentaryText) {
  isContentString(commentaryText);

  const rawMatches =
    Array.from(commentaryText.matchAll(commentaryRegexCaseInsensitive));

  if (empty(rawMatches)) {
    throw new TypeError(`Expected at least one commentary heading`);
  }

  const niceMatches =
    rawMatches.map(match => ({
      position: match.index,
      length: match[0].length,
    }));

  validateArrayItems(({position, length}, index) => {
    if (index === 0 && position > 0) {
      throw new TypeError(`Expected first commentary heading to be at top`);
    }

    const ownInput = commentaryText.slice(position, position + length);
    const restOfInput = commentaryText.slice(position + length);

    const upToNextLineBreak =
      (restOfInput.includes('\n')
        ? restOfInput.slice(0, restOfInput.indexOf('\n'))
        : restOfInput);

    if (/\S/.test(upToNextLineBreak)) {
      throw new TypeError(
        `Expected commentary heading to occupy entire line, got extra text:\n` +
        `${colors.green(`"${cut(ownInput, 40)}"`)} (<- heading)\n` +
        `(extra on same line ->) ${colors.red(`"${cut(upToNextLineBreak, 30)}"`)}\n` +
        `(Check for missing "|-" in YAML, or a misshapen annotation)`);
    }

    if (!commentaryRegexCaseSensitiveOneShot.test(ownInput)) {
      throw new TypeError(
        `Miscapitalization in commentary heading:\n` +
        `${colors.red(`"${cut(ownInput, 60)}"`)}\n` +
        `(Check for ${colors.red(`"<I>"`)} instead of ${colors.green(`"<i>"`)})`);
    }

    const nextHeading =
      (index === niceMatches.length - 1
        ? commentaryText.length
        : niceMatches[index + 1].position);

    const upToNextHeading =
      commentaryText.slice(position + length, nextHeading);

    if (!/\S/.test(upToNextHeading)) {
      throw new TypeError(
        `Expected commentary entry to have body text, only got a heading`);
    }

    return true;
  })(niceMatches);

  return true;
}

const isArtistRef = validateReference('artist');

export function validateProperties(spec) {
  const {
    [validateProperties.validateOtherKeys]: validateOtherKeys = null,
    [validateProperties.allowOtherKeys]: allowOtherKeys = false,
  } = spec;

  const specEntries = Object.entries(spec);
  const specKeys = Object.keys(spec);

  return (object) => {
    isObject(object);

    if (Array.isArray(object))
      throw new TypeError(`Expected an object, got array`);

    withAggregate({message: `Errors validating object properties`}, ({push}) => {
      const testEntries = specEntries.slice();

      const unknownKeys = Object.keys(object).filter((key) => !specKeys.includes(key));
      if (validateOtherKeys) {
        for (const key of unknownKeys) {
          testEntries.push([key, validateOtherKeys]);
        }
      }

      for (const [specKey, specValidator] of testEntries) {
        const value = object[specKey];
        try {
          specValidator(value);
        } catch (caughtError) {
          const keyPart = colors.green(specKey);
          const valuePart = inspect(value);
          const message = `Error for key ${keyPart}: ${valuePart}`;
          push(new Error(message, {cause: caughtError}));
        }
      }

      if (!validateOtherKeys && !allowOtherKeys && !empty(unknownKeys)) {
        push(new Error(
          `Unknown keys present (${unknownKeys.length}): [${unknownKeys.join(', ')}]`));
      }
    });

    return true;
  };
}

validateProperties.validateOtherKeys = Symbol();
validateProperties.allowOtherKeys = Symbol();

export const validateAllPropertyValues = (validator) =>
  validateProperties({
    [validateProperties.validateOtherKeys]: validator,
  });

const illeaglInvisibleSpace = {
  action: 'delete',
};

const illegalVisibleSpace = {
  action: 'replace',
  with: ' ',
  withAnnotation: `normal space`,
};

const illegalContentSpec = [
  {illegal: '\u200b', annotation: `zero-width space`, ...illeaglInvisibleSpace},
  {illegal: '\u2005', annotation: `four-per-em space`, ...illegalVisibleSpace},
  {illegal: '\u205f', annotation: `medium mathematical space`, ...illegalVisibleSpace},
  {illegal: '\xa0', annotation: `non-breaking space`, ...illegalVisibleSpace},

  {
    action: 'replace',
    illegal: '<a href',
    annotation: `HTML-style link`,
    with: '[...](...)',
    withAnnotation: `markdown`,
  },
];

for (const entry of illegalContentSpec) {
  entry.test = string =>
    string.startsWith(entry.illegal);

  if (entry.action === 'replace') {
    entry.enact = string =>
      string.replaceAll(entry.illegal, entry.with);
  }
}

const illegalSequencesInContent =
  illegalContentSpec
    .map(entry => entry.illegal)
    .map(illegal =>
      (illegal.length === 1
        ? `${illegal}+`
        : `(?:${illegal})+`))
    .join('|');

const illegalContentRegexp =
  new RegExp(illegalSequencesInContent, 'g');

const legalContentNearEndRegexp =
  new RegExp(`(?<=^|${illegalSequencesInContent})(?:(?!${illegalSequencesInContent}).)+$`);

const legalContentNearStartRegexp =
  new RegExp(`^(?:(?!${illegalSequencesInContent}).)+`);

const trimWhitespaceNearBothSidesRegexp =
  /^ +| +$/gm;

const trimWhitespaceNearEndRegexp =
  / +$/gm;

export function isContentString(content) {
  isString(content);

  const mainAggregate = openAggregate({
    message: `Errors validating content string`,
    translucent: 'single',
  });

  const illegalAggregate = openAggregate({
    message: `Illegal characters found in content string`,
  });

  for (const {match, where} of matchMultiline(content, illegalContentRegexp)) {
    const {annotation, action, ...options} =
      illegalContentSpec
        .find(entry => entry.test(match[0]));

    const matchStart = match.index;
    const matchEnd = match.index + match[0].length;

    const before =
      content
        .slice(Math.max(0, matchStart - 3), matchStart)
        .match(legalContentNearEndRegexp)
        ?.[0];

    const after =
      content
        .slice(matchEnd, Math.min(content.length, matchEnd + 3))
        .match(legalContentNearStartRegexp)
        ?.[0];

    const beforePart =
      before && `"${before}"`;

    const afterPart =
      after && `"${after}"`;

    const surroundings =
      (before && after
        ? `between ${beforePart} and ${afterPart}`
     : before
        ? `after ${beforePart}`
     : after
        ? `before ${afterPart}`
        : ``);

    const illegalPart =
      colors.red(
        (annotation
          ? `"${match[0]}" (${annotation})`
          : `"${match[0]}"`));

    const replacement =
      (action === 'replace'
        ? options.enact(match[0])
        : null);

    const replaceWithPart =
      (action === 'replace'
        ? colors.green(
            (options.withAnnotation
              ? `"${replacement}" (${options.withAnnotation})`
              : `"${replacement}"`))
        : null);

    const actionPart =
      (action === `delete`
        ? `Delete ${illegalPart}`
     : action === 'replace'
        ? `Replace ${illegalPart} with ${replaceWithPart}`
        : `Matched ${illegalPart}`);

    const parts = [
      actionPart,
      surroundings,
      `(${where})`,
    ].filter(Boolean);

    illegalAggregate.push(new TypeError(parts.join(` `)));
  }

  const isMultiline = content.includes('\n');

  const trimWhitespaceAggregate = openAggregate({
    message:
      (isMultiline
        ? `Whitespace found at end of line`
        : `Whitespace found at start or end`),
  });

  const trimWhitespaceRegexp =
    (isMultiline
      ? trimWhitespaceNearEndRegexp
      : trimWhitespaceNearBothSidesRegexp);

  for (
    const {match, lineNumber, columnNumber, containingLine} of
    matchMultiline(content, trimWhitespaceRegexp, {
      formatWhere: false,
      getContainingLine: true,
    })
  ) {
    const linePart =
      colors.yellow(`line ${lineNumber + 1}`);

    const where =
      (match[0].length === containingLine.length
        ? `as all of ${linePart}`
     : columnNumber === 0
        ? (isMultiline
            ? `at start of ${linePart}`
            : `at start`)
        : (isMultiline
            ? `at end of ${linePart}`
            : `at end`));

    const whitespacePart =
      colors.red(`"${match[0]}"`);

    const parts = [
      `Matched ${whitespacePart}`,
      where,
    ];

    trimWhitespaceAggregate.push(new TypeError(parts.join(` `)));
  }

  mainAggregate.call(() => illegalAggregate.close());
  mainAggregate.call(() => trimWhitespaceAggregate.close());
  mainAggregate.close();

  return true;
}

export function isThingClass(thingClass) {
  isFunction(thingClass);

  // This is *expressly* no faster than an instanceof check, because it's
  // deliberately still walking the prototype chain for the provided object.
  // (This is necessary because the symbol we're checking is defined only on
  // the Thing constructor, and not directly on each subclass.) However, it's
  // preferred over an instanceof check anyway, because instanceof would
  // require that the #validators module has access to #thing, which it
  // currently doesn't!
  if (!(Symbol.for('Thing.isThingConstructor') in thingClass)) {
    throw new TypeError(`Expected a Thing constructor, missing Thing.isThingConstructor`);
  }

  return true;
}

export function isThing(thing) {
  isObject(thing);

  // This *is* faster than an instanceof check, because it doesn't walk the
  // prototype chain. It works because this property is set as part of every
  // Thing subclass's inherited "public class fields" - it's set directly on
  // every constructed Thing.
  if (!Object.hasOwn(thing, Symbol.for('Thing.isThing'))) {
    throw new TypeError(`Expected a Thing, missing Thing.isThing`);
  }

  return true;
}

export const isContribution = validateProperties({
  artist: isArtistRef,
  annotation: optional(isStringNonEmpty),

  countInDurationTotals: optional(isBoolean),
  countInContributionTotals: optional(isBoolean),
});

export const isContributionList = validateArrayItems(isContribution);

export const contributionPresetPropertySpec = {
  album: [
    'artistContribs',
  ],

  flash: [
    'contributorContribs',
  ],

  track: [
    'artistContribs',
    'contributorContribs',
  ],
};

// TODO: This validator basically constructs itself as it goes.
// This is definitely some shenanigans!
export function isContributionPresetContext(list) {
  isArray(list);

  if (empty(list)) {
    throw new TypeError(`Expected at least one item`);
  }

  const isTarget =
    is(...Object.keys(contributionPresetPropertySpec));

  const [target, ...properties] = list;

  isTarget(target);

  const isProperty =
    is(...contributionPresetPropertySpec[target]);

  const isPropertyList =
    validateArrayItems(isProperty);

  isPropertyList(properties);

  return true;
}

export const isContributionPreset = validateProperties({
  annotation: isStringNonEmpty,
  context: isContributionPresetContext,

  countInDurationTotals: optional(isBoolean),
  countInContributionTotals: optional(isBoolean),
});

export const isContributionPresetList = validateArrayItems(isContributionPreset);

export const isAdditionalFile = validateProperties({
  title: isName,
  description: optional(isContentString),
  files: optional(validateArrayItems(isString)),
});

export const isAdditionalFileList = validateArrayItems(isAdditionalFile);

export const isTrackSection = validateProperties({
  name: optional(isName),
  color: optional(isColor),
  dateOriginallyReleased: optional(isDate),
  isDefaultTrackSection: optional(isBoolean),
  tracks: optional(validateReferenceList('track')),
});

export const isTrackSectionList = validateArrayItems(isTrackSection);

export const isSeries = validateProperties({
  name: isName,
  description: optional(isContentString),
  albums: optional(validateReferenceList('album')),

  showAlbumArtists:
    optional(is('all', 'differing', 'none')),
});

export const isSeriesList = validateArrayItems(isSeries);

export const isWallpaperPart = validateProperties({
  asset: optional(isString),
  style: optional(isString),
});

export const isWallpaperPartList = validateArrayItems(isWallpaperPart);

export function isDimensions(dimensions) {
  isArray(dimensions);

  if (dimensions.length !== 2) throw new TypeError(`Expected 2 item array`);

  if (dimensions[0] !== null) {
    isPositive(dimensions[0]);
    isInteger(dimensions[0]);
  }

  if (dimensions[1] !== null) {
    isPositive(dimensions[1]);
    isInteger(dimensions[1]);
  }

  return true;
}

export function isDirectory(directory) {
  isStringNonEmpty(directory);

  if (directory.match(/[^a-zA-Z0-9_-]/))
    throw new TypeError(`Expected only letters, numbers, dash, and underscore, got "${directory}"`);

  return true;
}

export function isDuration(duration) {
  isNumber(duration);
  isPositiveOrZero(duration);

  return true;
}

export function isFileExtension(string) {
  isStringNonEmpty(string);

  if (string[0] === '.')
    throw new TypeError(`Expected no dot (.) at the start of file extension`);

  if (string.match(/[^a-zA-Z0-9_]/))
    throw new TypeError(`Expected only alphanumeric and underscore`);

  return true;
}

export function isLanguageCode(string) {
  // TODO: This is a stub function because really we don't need a detailed
  // is-language-code parser right now.

  isString(string);

  return true;
}

export function isName(name) {
  return isContentString(name);
}

export function isURL(string) {
  isStringNonEmpty(string);

  new URL(string);

  return true;
}

export function validateReference(type) {
  return (ref) => {
    isStringNonEmpty(ref);

    const match = ref
      .trim()
      .match(/^(?:(?<typePart>\S+):(?=\S))?(?<directoryPart>.+)(?<!:)$/);

    if (!match) throw new TypeError(`Malformed reference`);

    const {groups: {typePart, directoryPart}} = match;

    if (typePart) {
      if (Array.isArray(type)) {
        if (!type.includes(typePart)) {
          throw new TypeError(
            `Expected ref to begin with one of ` +
            type.map(type => `"${type}:"`).join(', ') +
            `, got "${typePart}:"`);
        }
      } else if (typePart !== type) {
        throw new TypeError(
          `Expected ref to begin with "${type}:", got "${typePart}:"`);
      }

      isDirectory(directoryPart);
    }

    isName(ref);

    return true;
  };
}

export function validateReferenceList(type) {
  return validateArrayItems(validateReference(type));
}

export function validateThing({
  referenceType: expectedReferenceType = '',
} = {}) {
  return (thing) => {
    isThing(thing);

    if (expectedReferenceType) {
      const {[Symbol.for('Thing.referenceType')]: referenceType} =
        thing.constructor;

      if (referenceType !== expectedReferenceType) {
        throw new TypeError(`Expected only ${expectedReferenceType}, got other type: ${referenceType}`);
      }
    }

    return true;
  };
}

const validateWikiData_cache = {};

export function validateWikiData({
  referenceType = '',
  allowMixedTypes = false,
} = {}) {
  if (referenceType && allowMixedTypes) {
    throw new TypeError(`Don't specify both referenceType and allowMixedTypes`);
  }

  validateWikiData_cache[referenceType] ??= {};
  validateWikiData_cache[referenceType][allowMixedTypes] ??= new WeakMap();

  const isArrayOfObjects = validateArrayItems(isObject);

  return (array) => {
    const subcache = validateWikiData_cache[referenceType][allowMixedTypes];
    if (subcache.has(array)) return subcache.get(array);

    let OK = false;

    try {
      isArrayOfObjects(array);

      if (empty(array)) {
        OK = true; return true;
      }

      const allRefTypes = new Set();

      let foundThing = false;
      let foundOtherObject = false;

      for (const object of array) {
        if (Object.hasOwn(object, Symbol.for('Thing.isThing'))) {
          // Early-exit if a non-Thing object has been found - nothing more can
          // be learned.
          if (foundOtherObject) {
            throw new TypeError(`Expected array of wiki data objects, got mixed items`);
          }

          foundThing = true;
          allRefTypes.add(object.constructor[Symbol.for('Thing.referenceType')]);
        } else {
          // Early-exit if a Thing has been found - nothing more can be learned.
          if (foundThing) {
            throw new TypeError(`Expected array of wiki data objects, got mixed items`);
          }

          foundOtherObject = true;
        }
      }

      if (foundOtherObject && !foundThing) {
        throw new TypeError(`Expected array of wiki data objects, got array of other objects`);
      }

      if (allRefTypes.size > 1) {
        if (allowMixedTypes) {
          OK = true; return true;
        }

        const types = () => Array.from(allRefTypes).join(', ');

        if (referenceType) {
          if (allRefTypes.has(referenceType)) {
            allRefTypes.remove(referenceType);
            throw new TypeError(`Expected array of only ${referenceType}, also got other types: ${types()}`)
          } else {
            throw new TypeError(`Expected array of only ${referenceType}, got other types: ${types()}`);
          }
        }

        throw new TypeError(`Expected array of unmixed reference types, got multiple: ${types()}`);
      }

      const onlyRefType = Array.from(allRefTypes)[0];

      if (referenceType && onlyRefType !== referenceType) {
        throw new TypeError(`Expected array of ${referenceType}, got array of ${onlyRefType}`)
      }

      OK = true; return true;
    } finally {
      subcache.set(array, OK);
    }
  };
}

export const isAdditionalName = validateProperties({
  name: isContentString,
  annotation: optional(isContentString),
});

export const isAdditionalNameList = validateArrayItems(isAdditionalName);

// Compositional utilities

export function anyOf(...validators) {
  const validConstants = new Set();
  const validConstructors = new Set();
  const validTypes = new Set();

  const constantValidators = [];
  const constructorValidators = [];
  const typeValidators = [];

  const leftoverValidators = [];

  for (const validator of validators) {
    const creator = getValidatorCreator(validator);
    const creatorMeta = getValidatorCreatorMeta(validator);

    switch (creator) {
      case is:
        for (const value of creatorMeta.values) {
          validConstants.add(value);
        }

        constantValidators.push(validator);
        break;

      case validateInstanceOf:
        validConstructors.add(creatorMeta.constructor);
        constructorValidators.push(validator);
        break;

      case validateType:
        validTypes.add(creatorMeta.type);
        typeValidators.push(validator);
        break;

      default:
        leftoverValidators.push(validator);
        break;
    }
  }

  return (value) => {
    const errorInfo = [];

    if (validConstants.has(value)) {
      return true;
    }

    if (!empty(validTypes)) {
      if (validTypes.has(typeof value)) {
        return true;
      }
    }

    for (const constructor of validConstructors) {
      if (value instanceof constructor) {
        return true;
      }
    }

    for (const [i, validator] of leftoverValidators.entries()) {
      try {
        const result = validator(value);

        if (result !== true) {
          throw new Error(`Check returned false`);
        }

        return true;
      } catch (error) {
        errorInfo.push([validator, i, error]);
      }
    }

    // Don't process error messages until every validator has failed.

    const errors = [];
    const prefaceErrorInfo = [];

    let offset = 0;

    if (!empty(validConstants)) {
      const constants =
        Array.from(validConstants);

      const gotPart = `, got ${value}`;

      prefaceErrorInfo.push([
        constantValidators,
        offset++,
        new TypeError(
          `Expected any of ${constants.join(' ')}` + gotPart),
      ]);
    }

    if (!empty(validTypes)) {
      const types =
        Array.from(validTypes);

      const gotType = typeAppearance(value);
      const gotPart = `, got ${gotType}`;

      prefaceErrorInfo.push([
        typeValidators,
        offset++,
        new TypeError(
          `Expected any of ${types.join(', ')}` + gotPart),
      ]);
    }

    if (!empty(validConstructors)) {
      const names =
        Array.from(validConstructors)
          .map(constructor => constructor.name);

      const gotName = value?.constructor?.name;
      const gotPart = (gotName ? `, got ${gotName}` : ``);

      prefaceErrorInfo.push([
        constructorValidators,
        offset++,
        new TypeError(
          `Expected any of ${names.join(', ')}` + gotPart),
      ]);
    }

    for (const info of errorInfo) {
      info[1] += offset;
    }

    for (const [validator, i, error] of prefaceErrorInfo.concat(errorInfo)) {
      error.message =
        (validator?.name
          ? `${i + 1}. "${validator.name}": ${error.message}`
          : `${i + 1}. ${error.message}`);

      error.check =
        (Array.isArray(validator) && validator.length === 1
          ? validator[0]
          : validator);

      errors.push(error);
    }

    const total = offset + leftoverValidators.length;
    throw new AggregateError(errors,
      `Expected any of ${total} possible checks, ` +
      `but none were true`);
  };
}
