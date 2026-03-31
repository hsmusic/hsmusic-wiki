import '../group-contributions-table.js';

import * as additionalNamesBoxModule from './additional-names-box.js';
import * as albumCommentarySidebarModule from './album-commentary-sidebar.js';
import * as artTagGalleryFilterModule from './art-tag-gallery-filter.js';
import * as artTagNetworkModule from './art-tag-network.js';
import * as artistExternalLinkTooltipModule from './artist-external-link-tooltip.js';
import * as artistRollingWindowModule from './artist-rolling-window.js';
import * as cssCompatibilityAssistantModule from './css-compatibility-assistant.js';
import * as datetimestampTooltipModule from './datetimestamp-tooltip.js';
import * as draggedLinkModule from './dragged-link.js';
import * as expandableGridSectionModule from './expandable-grid-section.js';
import * as galleryStyleSelectorModule from './gallery-style-selector.js';
import * as hashLinkModule from './hash-link.js';
import * as hoverableTooltipModule from './hoverable-tooltip.js';
import * as imageOverlayModule from './image-overlay.js';
import * as intrapageDotSwitcherModule from './intrapage-dot-switcher.js';
import * as liveMousePositionModule from './live-mouse-position.js';
import * as memorableDetailsModule from './memorable-details.js';
import * as quickDescriptionModule from './quick-description.js';
import * as revealAllGridControlModule from './reveal-all-grid-control.js';
import * as scriptedLinkModule from './scripted-link.js';
import * as sidebarSearchModule from './sidebar-search.js';
import * as stickyHeadingModule from './sticky-heading.js';
import * as summaryNestedLinkModule from './summary-nested-link.js';
import * as textWithTooltipModule from './text-with-tooltip.js';
import * as wikiSearchModule from './wiki-search.js';

export const modules = [
  additionalNamesBoxModule,
  albumCommentarySidebarModule,
  artTagGalleryFilterModule,
  artTagNetworkModule,
  artistExternalLinkTooltipModule,
  artistRollingWindowModule,
  cssCompatibilityAssistantModule,
  datetimestampTooltipModule,
  draggedLinkModule,
  expandableGridSectionModule,
  galleryStyleSelectorModule,
  hashLinkModule,
  hoverableTooltipModule,
  imageOverlayModule,
  intrapageDotSwitcherModule,
  liveMousePositionModule,
  memorableDetailsModule,
  quickDescriptionModule,
  revealAllGridControlModule,
  scriptedLinkModule,
  sidebarSearchModule,
  stickyHeadingModule,
  summaryNestedLinkModule,
  textWithTooltipModule,
  wikiSearchModule,
];

const clientInfo = window.hsmusicClientInfo = Object.create(null);

// These steps are always run in the listed order, on page load.
// So for example, all modules' getPageReferences steps are evaluated, then
// all modules' addInternalListeners steps are evaluated, and so on.
const setupSteps = {
  bindSessionStorage: [],
  getPageReferences: [],
  addInternalListeners: [],
  mutatePageContent: [],
  initializeState: [],
  addPageListeners: [],
};

// These steps are run only on certain triggers. Those are global events,
// so all modules (which specify that step) respond in sequence.
const situationalSteps = {
  /* There's none yet... sorry... */
};

const stepInfoSymbol = Symbol();

const boundSessionStorage =
  window.hsmusicBoundSessionStorage =
  Object.create(null);

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
            formatRead = value => value === 'true' ? true : false;
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

      // There are two storage systems besides actual session storage in play.
      //
      // "Fallback" is for if session storage is not available, which may
      // suddenly become the case, i.e. access is temporarily revoked or fails.
      // The fallback value is controlled completely internally i.e. in this
      // infrastructure, in this lexical scope.
      //
      // "Bound" is for if the value kept in session storage was saved to
      // the page when the page was initially loaded, rather than a living
      // window on session storage (which may be affected by pages later in
      // the history stack). Whether or not bound storage is in effect is
      // controlled at page load (of course), by each module's own logic.
      //
      // Asterisk: Bound storage can't work miracles and if the page is
      // actually deloaded with its JavaScript state discarded, the bound
      // values are lost, even if the browser recreates on-page form state.

      let fallbackValue = defaultValue;
      let boundValue = undefined;

      const updateBoundValue = (givenValue = undefined) => {
        if (givenValue) {
          if (
            infoKey in boundSessionStorage &&
            key in boundSessionStorage[infoKey]
          ) {
            boundSessionStorage[infoKey][key] = givenValue;
          }
        } else {
          boundValue = boundSessionStorage[infoKey]?.[key];
        }
      };

      Object.defineProperty(info.session, key, {
        get: () => {
          updateBoundValue();

          let value;
          if (boundValue !== undefined) {
            value = boundValue ?? defaultValue;
          } else try {
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

          let sessionOperation;
          if (value === '') {
            fallbackValue = null;
            updateBoundValue(null);
            sessionOperation = () => {
              sessionStorage.removeItem(storageKey);
            };
          } else {
            fallbackValue = value;
            updateBoundValue(value);
            sessionOperation = () => {
              sessionStorage.setItem(storageKey, value);
            };
          }

          try {
            sessionOperation();
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

  for (const stepsObject of [setupSteps, situationalSteps]) {
    for (const key of Object.keys(stepsObject)) {
      if (Object.hasOwn(module, key)) {
        const fn = module[key];

        fn[stepInfoSymbol] = info;

        Object.defineProperty(fn, 'name', {
          value: `${infoKey}/${fn.name}`,
        });

        stepsObject[key].push(fn);
      }
    }
  }
}

function evaluateBindSessionStorageStep(bindSessionStorage) {
  const {id: infoKey, session: moduleExposedSessionObject} =
    bindSessionStorage[stepInfoSymbol];

  const generator = bindSessionStorage();

  let lastBoundValue;
  while (true) {
    const {value: key, done} = generator.next(lastBoundValue);
    const storageKey = `hsmusic.${infoKey}.${key}`;

    let value = undefined;
    try {
      value = sessionStorage.getItem(storageKey);
    } catch (error) {
      if (!(error instanceof DOMException)) {
        throw error;
      }
    }

    if (value === undefined) {
      // This effectively gets the default value.
      value = moduleExposedSessionObject[key];
    }

    boundSessionStorage[infoKey] ??= Object.create(null);
    boundSessionStorage[infoKey][key] = value;

    lastBoundValue = value;

    if (done) break;
  }
}

function evaluateStep(stepsObject, key) {
  for (const step of stepsObject[key]) {
    try {
      if (key === 'bindSessionStorage') {
        evaluateBindSessionStorageStep(step);
      } else {
        step();
      }
    } catch (error) {
      console.error(`During ${key}, failed to run ${step.name}`);
      console.error(error);
    }
  }
}

for (const key of Object.keys(setupSteps)) {
  evaluateStep(setupSteps, key);
}
