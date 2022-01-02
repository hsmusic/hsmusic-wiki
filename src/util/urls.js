// Code that deals with URLs (really the pathnames that get referenced all
// throughout the gener8ted HTML). Most nota8ly here is generateURLs, which
// is in charge of pre-gener8ting a complete network of template strings
// which can really quickly take su8stitute parameters to link from any one
// place to another; 8ut there are also a few other utilities, too.
//
// Nota8ly, everything here is string-8ased, for gener8ting and transforming
// actual path strings. More a8stract operations using wiki data o8jects is
// the domain of link.js.

import * as path from 'path';
import { withEntries } from './sugar.js';

export function generateURLs(urlSpec) {
    const getValueForFullKey = (obj, fullKey, prop = null) => {
        const [ groupKey, subKey ] = fullKey.split('.');
        if (!groupKey || !subKey) {
            throw new Error(`Expected group key and subkey (got ${fullKey})`);
        }

        if (!obj.hasOwnProperty(groupKey)) {
            throw new Error(`Expected valid group key (got ${groupKey})`);
        }

        const group = obj[groupKey];

        if (!group.hasOwnProperty(subKey)) {
            throw new Error(`Expected valid subkey (got ${subKey} for group ${groupKey})`);
        }

        return {
            value: group[subKey],
            group
        };
    };

    // This should be called on values which are going to be passed to
    // path.relative, because relative will resolve a leading slash as the root
    // directory of the working device, which we aren't looking for here.
    const trimLeadingSlash = P => P.startsWith('/') ? P.slice(1) : P;

    const generateTo = (fromPath, fromGroup) => {
        const A = trimLeadingSlash(fromPath);

        const rebasePrefix = '../'.repeat((fromGroup.prefix || '').split('/').filter(Boolean).length);

        const pathHelper = (toPath, toGroup) => {
            let B = trimLeadingSlash(toPath);

            let argIndex = 0;
            B = B.replaceAll('<>', () => `<${argIndex++}>`);

            if (toGroup.prefix !== fromGroup.prefix) {
                // TODO: Handle differing domains in prefixes.
                B = rebasePrefix + (toGroup.prefix || '') + B;
            }

            const suffix = (toPath.endsWith('/') ? '/' : '');

            return {
                posix: path.posix.relative(A, B) + suffix,
                device: path.relative(A, B) + suffix
            };
        };

        const groupSymbol = Symbol();

        const groupHelper = urlGroup => ({
            [groupSymbol]: urlGroup,
            ...withEntries(urlGroup.paths, entries => entries
                .map(([key, path]) => [key, pathHelper(path, urlGroup)]))
        });

        const relative = withEntries(urlSpec, entries => entries
            .map(([key, urlGroup]) => [key, groupHelper(urlGroup)]));

        const toHelper = (delimiterMode) => (key, ...args) => {
            const {
                value: {[delimiterMode]: template}
            } = getValueForFullKey(relative, key);

            let missing = 0;
            let result = template.replaceAll(/<([0-9]+)>/g, (match, n) => {
                if (n < args.length) {
                    return args[n];
                } else {
                    missing++;
                }
            });

            if (missing) {
                throw new Error(`Expected ${missing + args.length} arguments, got ${args.length} (key ${key}, args [${args}])`);
            }

            return result;
        };

        return {
            to: toHelper('posix'),
            toDevice: toHelper('device')
        };
    };

    const generateFrom = () => {
        const map = withEntries(urlSpec, entries => entries
            .map(([key, group]) => [key, withEntries(group.paths, entries => entries
                .map(([key, path]) => [key, generateTo(path, group)])
            )]));

        const from = key => getValueForFullKey(map, key).value;

        return {from, map};
    };

    return generateFrom();
}

const thumbnailHelper = name => file =>
    file.replace(/\.(jpg|png)$/, name + '.jpg');

export const thumb = {
    medium: thumbnailHelper('.medium'),
    small: thumbnailHelper('.small')
};
