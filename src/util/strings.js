import { logError, logWarn } from './cli.js';
import { bindOpts } from './sugar.js';

// Localiz8tion time! Or l10n as the neeeeeeeerds call it. Which is a terri8le
// name and not one I intend on using, thank you very much. (Don't even get me
// started on """"a11y"""".)
//
// All the default strings are in strings-default.json, if you're curious what
// those actually look like. Pretty much it's "I like {ANIMAL}" for example.
// For each language, the o8ject gets turned into a single function of form
// f(key, {args}). It searches for a key in the o8ject and uses the string it
// finds (or the one in strings-default.json) as a templ8 evaluated with the
// arguments passed. (This function gets treated as an o8ject too; it gets
// the language code attached.)
//
// The function's also responsi8le for getting rid of dangerous characters
// (quotes and angle tags), though only within the templ8te (not the args),
// and it converts the keys of the arguments o8ject from camelCase to
// CONSTANT_CASE too.
//
// This function also takes an optional "bindUtilities" argument; it should
// look like a dictionary each value of which is itself a util dictionary,
// each value of which is a function in the format (value, opts) => (...).
// Each of those util dictionaries will 8e attached to the final returned
// strings() function, containing functions which automatically have that
// same strings() function provided as part of its opts argument (alongside
// any additional arguments passed).
//
// Basically, it's so that instead of doing:
//
//     count.tracks(album.tracks.length, {strings})
//
// ...you can just do:
//
//     strings.count.tracks(album.tracks.length)
//
// Definitely note bindUtilities expects an OBJECT, not an array, otherwise
// it won't 8e a8le to know what keys to attach the utilities 8y!
//
// Oh also it'll need access to the he.encode() function, and callers have to
// provide that themselves, 'cuz otherwise we can't reference this file from
// client-side code.
export function genStrings(stringsJSON, {
    he,
    defaultJSON = null,
    bindUtilities = {}
}) {
    // genStrings will only 8e called once for each language, and it happens
    // right at the start of the program (or at least 8efore 8uilding pages).
    // So, now's a good time to valid8te the strings and let any warnings be
    // known.

    // May8e contrary to the argument name, the arguments should 8e o8jects,
    // not actual JSON-formatted strings!
    if (typeof stringsJSON !== 'object' || stringsJSON.constructor !== Object) {
        return {error: `Expected an object (parsed JSON) for stringsJSON.`};
    }
    if (typeof defaultJSON !== 'object') { // typeof null === object. I h8 JS.
        return {error: `Expected an object (parsed JSON) or null for defaultJSON.`};
    }

    // All languages require a language code.
    const code = stringsJSON['meta.languageCode'];
    if (!code) {
        return {error: `Missing language code.`};
    }
    if (typeof code !== 'string') {
        return {error: `Expected language code to be a string.`};
    }

    // Lanuages can also provide a 8ase-directory code, which will otherwise
    // default to the language code. This controls the name of the directory the
    // localized HTML will 8e outputted to, which could 8e useful for, like,
    // testing a 8uild of the site with one language JSON set somewhere besides
    // the default directory.
    //
    // Note that internally, baseDirectory, not code, is the property used to
    // identify a language - two language files may share a language code (like
    // "en" or "es), but base directories should always be unique.
    let baseDirectory = stringsJSON['meta.baseDirectory'];
    if (!baseDirectory) {
        baseDirectory = code;
    }
    if (typeof baseDirectory !== 'string') {
        return {Error: `Expected base directory to be a string.`};
    }

    // Every value on the provided o8ject should be a string.
    // (This is lazy, but we only 8other checking this on stringsJSON, on the
    // assumption that defaultJSON was passed through this function too, and so
    // has already been valid8ted.)
    {
        let err = false;
        for (const [ key, value ] of Object.entries(stringsJSON)) {
            if (typeof value !== 'string') {
                logError`(${baseDirectory}) The value for ${key} should be a string.`;
                err = true;
            }
        }
        if (err) {
            return {error: `Expected all values to be a string.`};
        }
    }

    // Checking is generally done against the default JSON, so we'll skip out
    // if that isn't provided (which should only 8e the case when it itself is
    // 8eing processed as the first loaded language).
    if (defaultJSON) {
        // Warn for keys that are missing or unexpected.
        const expectedKeys = Object.keys(defaultJSON);
        const presentKeys = Object.keys(stringsJSON);
        for (const key of presentKeys) {
            if (!expectedKeys.includes(key)) {
                logWarn`(${baseDirectory}) Unexpected translation key: ${key} - this won't be used!`;
            }
        }
        for (const key of expectedKeys) {
            if (!presentKeys.includes(key)) {
                logWarn`(${baseDirectory}) Missing translation key: ${key} - this won't be localized!`;
            }
        }
    }

    // Valid8tion is complete, 8ut We can still do a little caching to make
    // repeated actions faster.

    // We're gonna 8e mut8ting the strings dictionary o8ject from here on out.
    // We make a copy so we don't mess with the one which was given to us.
    stringsJSON = Object.assign({}, stringsJSON);

    // Preemptively pass everything through HTML encoding. This will prevent
    // strings from embedding HTML tags or accidentally including characters
    // that throw HTML parsers off.
    for (const key of Object.keys(stringsJSON)) {
        stringsJSON[key] = he.encode(stringsJSON[key], {useNamedReferences: true});
    }

    // It's time to cre8te the actual langauge function!

    // In the function, we don't actually distinguish 8etween the primary and
    // default (fall8ack) strings - any relevant warnings have already 8een
    // presented a8ove, at the time the language JSON is processed. Now we'll
    // only 8e using them for indexing strings to use as templ8tes, and we can
    // com8ine them for that.
    const stringIndex = Object.assign({}, defaultJSON, stringsJSON);

    // We do still need the list of valid keys though. That's 8ased upon the
    // default strings. (Or stringsJSON, 8ut only if the defaults aren't
    // provided - which indic8tes that the single o8ject provided *is* the
    // default.)
    const validKeys = Object.keys(defaultJSON || stringsJSON);

    const invalidKeysFound = [];

    const strings = (key, args = {}) => {
    };

    // And lastly, we add some utility stuff to the strings function.

    // Store the language code, for convenience of access.
    strings.code = code;

    // Store the strings dictionary itself, also for convenience.
    strings.json = stringsJSON;

    // Same with the base directory.
    strings.baseDirectory = baseDirectory;

    // Store Intl o8jects that can 8e reused for value formatting.
    strings.intl = {
        date: new Intl.DateTimeFormat(code, {full: true}),
        number: new Intl.NumberFormat(code),
        list: {
            conjunction: new Intl.ListFormat(code, {type: 'conjunction'}),
            disjunction: new Intl.ListFormat(code, {type: 'disjunction'}),
            unit: new Intl.ListFormat(code, {type: 'unit'})
        },
        plural: {
            cardinal: new Intl.PluralRules(code, {type: 'cardinal'}),
            ordinal: new Intl.PluralRules(code, {type: 'ordinal'})
        }
    };

    // And the provided utility dictionaries themselves, of course!
    for (const [key, utilDict] of Object.entries(bindUtilities)) {
        const boundUtilDict = {};
        for (const [key, fn] of Object.entries(utilDict)) {
            boundUtilDict[key] = bindOpts(fn, {strings});
        }
        strings[key] = boundUtilDict;
    }

    return strings;
}

const countHelper = (stringKey, argName = stringKey) => (value, {strings, unit = false}) => strings(
    (unit
        ? `count.${stringKey}.withUnit.` + strings.intl.plural.cardinal.select(value)
        : `count.${stringKey}`),
    {[argName]: strings.intl.number.format(value)});

export const count = {
    date: (date, {strings}) => {
        return strings.intl.date.format(date);
    },

    dateRange: ([startDate, endDate], {strings}) => {
        return strings.intl.date.formatRange(startDate, endDate);
    },

    duration: (secTotal, {strings, approximate = false, unit = false}) => {
    },

    index: (value, {strings}) => {
    },

    number: value => strings.intl.number.format(value),

    words: (value, {strings, unit = false}) => {
        const num = strings.intl.number.format(value > 1000
            ? Math.floor(value / 100) / 10
            : value);

        const words = (value > 1000
            ? strings('count.words.thousand', {words: num})
            : strings('count.words', {words: num}));

        return strings('count.words.withUnit.' + strings.intl.plural.cardinal.select(value), {words});
    },

    albums: countHelper('albums'),
    commentaryEntries: countHelper('commentaryEntries', 'entries'),
    contributions: countHelper('contributions'),
    coverArts: countHelper('coverArts'),
    timesReferenced: countHelper('timesReferenced'),
    timesUsed: countHelper('timesUsed'),
    tracks: countHelper('tracks')
};

const listHelper = type => (list, {strings}) => strings.intl.list[type].format(list);

export const list = {
    unit: listHelper('unit'),
    or: listHelper('disjunction'),
    and: listHelper('conjunction')
};
