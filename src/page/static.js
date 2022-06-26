// @format
//
// Static content page specification. (These are static pages coded into the
// wiki data folder, used for a variety of purposes, e.g. wiki info,
// changelog, and so on.)

// Imports

import fixWS from "fix-whitespace";

// Page exports

export function targets({ wikiData }) {
  return wikiData.staticPageData;
}

export function write(staticPage, { wikiData }) {
  const page = {
    type: "page",
    path: ["staticPage", staticPage.directory],
    page: ({ language, transformMultiline }) => ({
      title: staticPage.name,
      stylesheet: staticPage.stylesheet,

      main: {
        content: fixWS`
                    <div class="long-content">
                        <h1>${staticPage.name}</h1>
                        ${transformMultiline(staticPage.content)}
                    </div>
                `,
      },

      nav: { simple: true },
    }),
  };

  return [page];
}
