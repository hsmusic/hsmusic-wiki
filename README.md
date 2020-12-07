# HSMusic

HSMusic, short for the *Homestuck Music Wiki*, is a revitalization and reimagining of [earlier][fandom] [projects][nsnd] archiving and celebrating the expansive history of Homestuck official and fan music. Roughly periodic releases of the website are released at [hsmusic.wiki][hsmusic]; all development occurs in this public Git repository, which can be accessed at [notabug.org][notabug] and [ed1.club][ed1club].

## Project Structure

**Disclaimer:** most of the code here *sucks*. It's been shambled together over the course of over a year, and while we're fairly confident it's all at minimum functional, we can't guarantee the same about its understandability! Still, for the official release of [hsmusic.wiki][hsmusic], we've done our best to put together a codebase which is *somewhat* navigable. The description below summarizes it:

* `upd8.js`: "Build" code for the site. Everything specific to generating the structure and HTML content of the website is conatined in this file. As expected, it's pretty massive.
* `static`: Static code and supporting files. Everything here is wholly client-side and referenced by the generated HTML files.
* `common`: Code which is depended upon by both client- and server-side code. For the most part, this is constants such as directory paths, though there are a few handy algorithms here too.
* `data`: The majority of data files belonging to the wiki are here. If you were to, say, create a fork of hsmusic for some other music archival project, you'd want to change the files here. Data files are all a custom text format designed to be easy to edit, process, and maintain; they should be self-descriptive.
  * There are a few HTML files in here as well, for static content in pages like "about", "changelog", etc.
* `media`: Images and other static files referenced by generated and static content across the site. Many of the files here are cover art, and their names match the automatically generated "kebab case" identifiers for tracks and albums (or a manually overridden one).

The code process for upd8.js was politely introduced by 2019!us back when we were beginning the site, and it's essentially the same structure followed today. In summary:

1. Locate and read data files, processing them into relatively usable JS object-style formats. (The formats themselves are hard-coded and somewhat arbitrary, and are often extended when more or different data is useful.)
2. Validate the data and show any errors that might've been caught during processing. (These aren't exhaustive test cases; they're designed to catch a majority of common errors and typos.)
3. Create symlinks for static files and generate the basic directory structure for the site.
4. Generate and write HTML files containing all content. (Rather than use external templates and a complex build system, we just use template strings in combination with [a whitespace utility][fixws] and some handy tricks for manipulating strings and JS.)

The majority of the code volume is generated HTML content and supporting utility functions; while we've attempted to keep the update file more or less organized, the most reliable way to navigate is to just ctrl-F for the function definitions of whatever you intend to work on. Code order isn't super strict since everything is handled by separate function calls (which all branch off of the "main" function at the end of the file).

In the past, data, HTML, and media files were all interspersed with each other. Yea, even the generated HTML files were included as part of the repository; their diffs, part of every commit. Those were dark times indeed.

  [fandom]: https://homestuck-and-mspa-music.fandom.com/wiki/Homestuck_and_MSPA_Music_Wiki
  [nsnd]: https://homestuck.net/music/references.html
  [hsmusic]: https://hsmusic.wiki
  [notabug]: https://notabug.org/hsmusic/hsmusic
  [ed1club]: https://git.ed1.club/florrie/hsmusic
  [fixws]: https://www.npmjs.com/package/fix-whitespace
