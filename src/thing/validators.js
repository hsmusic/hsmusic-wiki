import { withAggregate } from '../util/sugar.js';

// Basic types (primitives)

function a(noun) {
    return (/[aeiou]/.test(noun[0]) ? `an ${noun}` : `a ${noun}`);
}

function isType(value, type) {
    if (typeof value !== type)
        throw new TypeError(`Expected ${a(type)}, got ${typeof value}`);

    return true;
}

export function isBoolean(value) {
    return isType(value, 'boolean');
}

export function isNumber(value) {
    return isType(value, 'number');
}

export function isPositive(number) {
    isNumber(number);

    if (number <= 0)
        throw new TypeError(`Expected positive number`);

    return true;
}

export function isNegative(number) {
    isNumber(number);

    if (number >= 0)
        throw new TypeError(`Expected negative number`);

    return true;
}

export function isInteger(number) {
    isNumber(number);

    if (number % 1 !== 0)
        throw new TypeError(`Expected integer`);

    return true;
}

export function isString(value) {
    return isType(value, 'string');
}

export function isStringNonEmpty(value) {
    isString(value);

    if (value.trim().length === 0)
        throw new TypeError(`Expected non-empty string`);

    return true;
}

// Complex types (non-primitives)

function isInstance(value, constructor) {
    isObject(value);

    if (!(value instanceof constructor))
        throw new TypeError(`Expected ${constructor.name}, got ${value.constructor.name}`);

    return true;
}

export function isDate(value) {
    return isInstance(value, Date);
}

export function isObject(value) {
    isType(value, 'object');

    // Note: Please remember that null is always a valid value for properties
    // held by a CacheableObject. This assertion is exclusively for use in other
    // contexts.
    if (value === null)
        throw new TypeError(`Expected an object, got null`);

    return true;
}

export function isArray(value) {
    isObject(value);

    if (!Array.isArray(value))
        throw new TypeError(`Expected an array, got ${value}`);

    return true;
}

export function validateArrayItems(itemValidator) {
    return array => {
        isArray(array);

        withAggregate({message: 'Errors validating array items'}, ({ wrap }) => {
            array.forEach(wrap(itemValidator));
        });

        return true;
    };
}

// Wiki data (primitives & non-primitives)

export function isColor(color) {
    isStringNonEmpty(color);

    if (color.startsWith('#')) {
        if (![1 + 3, 1 + 4, 1 + 6, 1 + 8].includes(color.length))
            throw new TypeError(`Expected #rgb, #rgba, #rrggbb, or #rrggbbaa, got length ${color.length}`);

        if (/[^0-9a-fA-F]/.test(color.slice(1)))
            throw new TypeError(`Expected hexadecimal digits`);

        return true;
    }

    throw new TypeError(`Unknown color format`);
}

export function isCommentary(commentary) {
    return isString(commentary);
}

const isArtistRef = validateReference('artist');

export function isContribution(contrib) {
    // TODO: Use better object validation for this (supporting aggregates etc)

    isObject(contrib);

    isArtistRef(contrib.who);

    if (contrib.what !== null) {
        isStringNonEmpty(contrib.what);
    }

    return true;
}

export const isContributionList = validateArrayItems(isContribution);

export function isDimensions(dimensions) {
    isArray(dimensions);

    if (dimensions.length !== 2)
        throw new TypeError(`Expected 2 item array`);

    isPositive(dimensions[0]);
    isInteger(dimensions[0]);
    isPositive(dimensions[1]);
    isInteger(dimensions[1]);

    return true;
}

export function isDirectory(directory) {
    isStringNonEmpty(directory);

    if (directory.match(/[^a-zA-Z0-9\-]/))
        throw new TypeError(`Expected only letters, numbers, and dash, got "${directory}"`);

    return true;
}

export function isName(name) {
    return isString(name);
}

export function isURL(string) {
    isStringNonEmpty(string);

    new URL(string);

    return true;
}

export function validateReference(type = 'track') {
    return ref => {
        isStringNonEmpty(ref);

        const hasTwoParts = ref.includes(':');
        const [ typePart, directoryPart ] = ref.split(':');

        if (hasTwoParts && typePart !== type)
            throw new TypeError(`Expected ref to begin with "${type}:", got "${typePart}:" (ref: ${ref})`);

        if (hasTwoParts)
            isDirectory(directoryPart);

        isName(ref);

        return true;
    };
}

export function validateReferenceList(type = '') {
    return validateArrayItems(validateReference(type));
}
