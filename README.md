# HSMusic

HSMusic, short for the *Homestuck Music Wiki*, is a revitalization and reimagining of [earlier][fandom] [projects][nsnd] archiving and celebrating the expansive history of Homestuck official and fan music. Roughly periodic releases of the website are released at [hsmusic.wiki][hsmusic]; all development occurs in this public Git repository, which can be accessed at [notabug.org][notabug].

## Project Structure

**Disclaimer:** most of the code here *sucks*. It's been shambled together over the course of over a year, and while we're fairly confident it's all at minimum functional, we can't guarantee the same about its understandability! Still, for the official release of [hsmusic.wiki][hsmusic], we've done our best to put together a codebase which is *somewhat* navigable. The description below summarizes it:

* `upd8`: "Build" code for the site. Everything specific to generating the structure and HTML content of the website is conatined in this folder. As expected, it's pretty massive, and is currently undergoing some much-belated restructuring.
* `static`: Static code and supporting files. Everything here is wholly client-side and referenced by the generated HTML files.
* `common`: Code which is depended upon by both client- and server-side code. For the most part, this is constants such as directory paths, though there are a few handy algorithms here too.
* In the not quite so far past, we used to have `data` and `media` folders too. Today, for portability and convenience in project structure, those are saved in separate repositories, and you can pass hsmusic paths to them through the `--data` and `--media` options, or the `HSMUSIC_DATA` and `HSMUSIC_MEDIA` environment variables.
  * Data directory: The majority of data files belonging to the wiki are here. If you were to, say, create a fork of hsmusic for some other music archival project, you'd want to change the files here. Data files are all a custom text format designed to be easy to edit, process, and maintain; they should be self-descriptive.
  * Media directory: Images and other static files referenced by generated and static content across the site. Many of the files here are cover art, and their names match the automatically generated "kebab case" identifiers for tracks and albums (or a manually overridden one).
* Same for the output root: previously it was in a `site` folder; today, use `--out` or `HSMUSIC_OUT`!

The upd8 code process was politely introduced by 2019!us back when we were beginning the site, and it's essentially the same structure followed today. In summary:

1. Locate and read data files, processing them into relatively usable JS object-style formats. (The formats themselves are hard-coded and somewhat arbitrary, and are often extended when more or different data is useful.)
2. Validate the data and show any errors that might've been caught during processing. (These aren't exhaustive test cases; they're designed to catch a majority of common errors and typos.)
3. Create symlinks for static files and generate the basic directory structure for the site.
4. Generate and write HTML files containing all content. (Rather than use external templates and a complex build system, we just use template strings in combination with [a whitespace utility][fixws] and some handy tricks for manipulating strings and JS.)

The majority of the code volume is generated HTML content and supporting utility functions; while we've attempted to keep the update file more or less organized, the most reliable way to navigate is to just ctrl-F for the function definitions of whatever you intend to work on. Code order isn't super strict since everything is handled by separate function calls (which all branch off of the "main" function at the end of the file).

In the past, data, HTML, and media files were all interspersed with each other. Yea, even the generated HTML files were included as part of the repository; their diffs, part of every commit. Those were dark times indeed.

## Forking

hsmusic is a relatively generic music wiki software, so you're more than encouraged to create a fork for your own archival or cataloguing purposes! You're encouraged to [drop us a link][feedback] if you do - we'd love to hear from you.

Still, at present moment, a fair bit of the wiki design is baked into the update code itself - any configuration (such as getting rid of the "flashes & games") section will have you digging into the code yourself. In the future, we'd love to make the wiki software more customizable from a forking perspective, but we haven't gotten to it yet. Let us know if this is something you're interested in - we'd love to chat about what additions or changes would be useful in making a more versatile generic music wiki software!

## Pull Requests

As mentioned, part of the focus of the hsmusic.wiki release was to create a more modular and develop-able repository. So, on the curious chance anyone would like to contribute code to the repo, such is certainly capable now!

Still, for larger additions, I'd encourage you to throw an email or contact ([links here][feedback]) before writing all the implementation code: besides code tips which might make your life a bit easier (questions are welcome), I'd also love to discuss feature designs and values while they're still being brainstormed! That way, I don't need to tell you there are fundamental ideas or code details I'd want rebuilt - the last thing I want is anyone putting hours into code which could have been avoided being poured down the drain!

As ever, feedback is always welcome, and may be shared via the usual links. Thank you for checking the repository out!

  [fandom]: https://homestuck-and-mspa-music.fandom.com/wiki/Homestuck_and_MSPA_Music_Wiki
  [nsnd]: https://homestuck.net/music/references.html
  [hsmusic]: https://hsmusic.wiki
  [notabug]: https://notabug.org/hsmusic/hsmusic
  [fixws]: https://www.npmjs.com/package/fix-whitespace
  [feedback]: https://hsmusic.wiki/feedback/
