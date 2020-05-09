# Dynamic bundling

The goal of this repo is to make:

1. standard-ish looking webpack bundles
2. that can be concatenated
3. and have their modules deduplicated
4. without changing functionality (much)

## Problem parameters

-   We'll need to retain the module's init function and give each bundle its own copy of it.
-   Each bundle will therefore need its own module cache
-   We should almost certainly use an AST parser to delete modules as needed — strings or comments are unreliable.

## Research notes

-   `jscodeshift` has a great AST querying and modifying API. It uses recast under the hood, which in turn uses esprima ([by default][recast-parser]) for parsing (we can pretty easily swap the parser out it seems).
-   I'm not sure if this is supported in other parsers or not, but Babel's `generate` can [concatenate files together][babel-generate-concat] and keep references to separate original files as needed.
-   Acorn is conservative in its parsing syntax support. This isn't the end of the world for this application, but in general it may not be a good bet to use.
-   In terms of speed, I am really excited about [swc][swc], which is a rust implementation of JavaScript AST parsing. If our concern is speed, Rust (or any lower-level language) would be a much better choice than JavaScript. They have a code transform example [here][swc-visitor].

[recast-parser]: https://github.com/benjamn/recast/blob/822b013/lib/options.ts#L8-L14
[babel-generate-concat]: https://github.com/babel/website/blob/master/docs/generator.md#ast-from-multiple-sources
[swc]: https://swc-project.github.io/
[swc-visitor]: https://swc-project.github.io/docs/usage-plugin
