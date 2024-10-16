/* eslint-env browser */

import '../group-contributions-table.js';
import '../image-overlay.js';

import * as additionalNamesBoxModule from './additional-names-box.js';
import * as albumCommentarySidebarModule from './album-commentary-sidebar.js';
import * as artistExternalLinkTooltipModule from './artist-external-link-tooltip.js';
import * as cssCompatibilityAssistantModule from './css-compatibility-assistant.js';
import * as datetimestampTooltipModule from './datetimestamp-tooltip.js';
import * as hashLinkModule from './hash-link.js';
import * as hoverableTooltipModule from './hoverable-tooltip.js';
import * as intrapageDotSwitcherModule from './intrapage-dot-switcher.js';
import * as liveMousePositionModule from './live-mouse-position.js';
import * as quickDescriptionModule from './quick-description.js';
import * as scriptedLinkModule from './scripted-link.js';
import * as sidebarSearchModule from './sidebar-search.js';
import * as stickyHeadingModule from './sticky-heading.js';
import * as summaryNestedLinkModule from './summary-nested-link.js';
import * as textWithTooltipModule from './text-with-tooltip.js';
import * as wikiSearchModule from './wiki-search.js';

export const modules = [
  additionalNamesBoxModule,
  albumCommentarySidebarModule,
  artistExternalLinkTooltipModule,
  cssCompatibilityAssistantModule,
  datetimestampTooltipModule,
  hashLinkModule,
  hoverableTooltipModule,
  intrapageDotSwitcherModule,
  liveMousePositionModule,
  quickDescriptionModule,
  scriptedLinkModule,
  sidebarSearchModule,
  stickyHeadingModule,
  summaryNestedLinkModule,
  textWithTooltipModule,
  wikiSearchModule,
];

const clientInfo = window.hsmusicClientInfo = Object.create(null);

const clientSteps = {
  getPageReferences: [],
  addInternalListeners: [],
  mutatePageContent: [],
  initializeState: [],
  addPageListeners: [],
};

for (const module of modules) {
  const {info} = module;

  if (!info) {
    throw new Error(`Module missing info`);
  }

  const {id: infoKey} = info;

  if (!infoKey) {
    throw new Error(`Module info missing id: ` + JSON.stringify(info));
  }

  clientInfo[infoKey] = info;

  for (const obj of [
    info,
    info.state,
    info.settings,
    info.event,
  ]) {
    if (!obj) continue;

    if (obj !== info) {
      obj[Symbol.for('hsmusic.clientInfo')] = info;
    }

    Object.preventExtensions(obj);
  }

  if (info.session) {
    const sessionSpecs = info.session;

    info.session = {};

    for (const [key, spec] of Object.entries(sessionSpecs)) {
      const hasSpec =
        typeof spec === 'object' && spec !== null;

      const defaultValue =
        (hasSpec
          ? spec.default ?? null
          : spec);

      let formatRead = value => value;
      let formatWrite = value => value;
      if (hasSpec && spec.type) {
        switch (spec.type) {
          case 'number':
            formatRead = parseFloat;
            formatWrite = String;
            break;

          case 'boolean':
            formatRead = Boolean;
            formatWrite = String;
            break;

          case 'string':
            formatRead = String;
            formatWrite = String;
            break;

          case 'json':
            formatRead = JSON.parse;
            formatWrite = JSON.stringify;
            break;

          default:
            throw new Error(`Unknown type for session storage spec "${spec.type}"`);
        }
      }

      let getMaxLength =
        (!hasSpec
          ? () => Infinity
       : typeof spec.maxLength === 'function'
          ? (info.settings
              ? () => spec.maxLength(info.settings)
              : () => spec.maxLength())
          : () => spec.maxLength);

      const storageKey = `hsmusic.${infoKey}.${key}`;

      let fallbackValue = defaultValue;

      Object.defineProperty(info.session, key, {
        get: () => {
          let value;
          try {
            value = sessionStorage.getItem(storageKey) ?? defaultValue;
          } catch (error) {
            if (error instanceof DOMException) {
              value = fallbackValue;
            } else {
              throw error;
            }
          }

          if (value === null) {
            return null;
          }

          return formatRead(value);
        },

        set: (value) => {
          if (value !== null && value !== '') {
            value = formatWrite(value);
          }

          if (value === null) {
            value = '';
          }

          const maxLength = getMaxLength();
          if (value.length > maxLength) {
            console.warn(
              `Requested to set session storage ${storageKey} ` +
              `beyond maximum length ${maxLength}, ` +
              `ignoring this value.`);
            console.trace();
            return;
          }

          let operation;
          if (value === '') {
            fallbackValue = null;
            operation = () => {
              sessionStorage.removeItem(storageKey);
            };
          } else {
            fallbackValue = value;
            operation = () => {
              sessionStorage.setItem(storageKey, value);
            };
          }

          try {
            operation();
          } catch (error) {
            if (!(error instanceof DOMException)) {
              throw error;
            }
          }
        },
      });
    }

    Object.preventExtensions(info.session);
  }

  for (const key of Object.keys(clientSteps)) {
    if (Object.hasOwn(module, key)) {
      const fn = module[key];

      Object.defineProperty(fn, 'name', {
        value: `${infoKey}/${fn.name}`,
      });

      clientSteps[key].push(fn);
    }
  }
}

for (const [key, steps] of Object.entries(clientSteps)) {
  for (const step of steps) {
    try {
      step();
    } catch (error) {
      // TODO: Be smarter about not running later steps for the same module!
      // Or maybe not, since an error is liable to cause explosions anyway.
      console.error(`During ${key}, failed to run ${step.name}`);
      console.error(error);
    }
  }
}
