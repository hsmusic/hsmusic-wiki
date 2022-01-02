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

    const generateTo = (fromPath, fromGroup) => {
        const rebasePrefix = '../'.repeat((fromGroup.prefix || '').split('/').filter(Boolean).length);

        const pathHelper = (toPath, toGroup) => {
            let target = toPath;

            let argIndex = 0;
            target = target.replaceAll('<>', () => `<${argIndex++}>`);

            if (toGroup.prefix !== fromGroup.prefix) {
                // TODO: Handle differing domains in prefixes.
                target = rebasePrefix + (toGroup.prefix || '') + target;
            }

            const suffix = (toPath.endsWith('/') ? '/' : '');

            return {
                posix: path.posix.relative(fromPath, target) + suffix,
                device: path.relative(fromPath, target) + suffix
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
                value: {[delimiterMode]: template},
                group: {[groupSymbol]: toGroup}
            } = getValueForFullKey(relative, key);

            let result = template.replaceAll(/<([0-9]+)>/g, (match, n) => args[n]);

            // Kinda hacky lol, 8ut it works.
            const missing = result.match(/<([0-9]+)>/g);
            if (missing) {
                throw new Error(`Expected ${missing[missing.length - 1]} arguments, got ${args.length}`);
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
