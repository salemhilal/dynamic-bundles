# Dynamic bundling

The goal of this repo is to make:

1. standard-ish looking webpack bundles
2. that can be concatenated
3. and have their modules deduplicated
4. without changing functionality (much)

## I wanna do it

From the root of this repo, run:

```sh
yarn install        # get dependencies
yarn build          # build two scripts the boring way
yarn synergize      # synergize the two scripts into one file
yarn serve          # start a server that serves both approaches up
```

Then, visit [`http://127.0.0.1:8080`](http://127.0.0.1:8080) and open either of the html files to see the two approaches.

## Problem parameters

-   We'll need to retain the module's init function and give each bundle its own copy of it.
-   Each bundle will therefore need its own module cache
-   We should almost certainly use an AST parser to delete modules as needed — strings or comments are unreliable.
-   We'll need to have a solution to minifying. At the very least, we could remove all `CommentBlock` or `CommentLine` nodes on the way out.

## Benchmarks

-   On my 2.3Ghz i7 laptop, synergizer runs in roughly 70ms.
-   In this pretty contrived example, it saves 1.37kb.

## To do

-   Try this on larger files and larger dependency trees.
-   Do this in typescript.

## Research notes

-   `jscodeshift` has a great AST querying and modifying API. It uses recast under the hood, which in turn uses esprima ([by default][recast-parser]) for parsing (we can pretty easily swap the parser out it seems).
-   I'm not sure if this is supported in other parsers or not, but Babel's `generate` can [concatenate files together][babel-generate-concat] and keep references to separate original files as needed.
-   Acorn is conservative in its parsing syntax support. This isn't the end of the world for this application, but in general it may not be a good bet to use.
-   In terms of speed, I am really excited about [swc][swc], which is a rust implementation of JavaScript AST parsing. If our concern is speed, Rust (or any lower-level language) would be a much better choice than JavaScript. They have a code transform example [here][swc-visitor]. That being said, the simple examples in this repo build in ~70ms, which is _oh kay_. That can be improved in a bunch of ways (by parsing AST's ahead of time, for example).

[recast-parser]: https://github.com/benjamn/recast/blob/822b013/lib/options.ts#L8-L14
[babel-generate-concat]: https://github.com/babel/website/blob/master/docs/generator.md#ast-from-multiple-sources
[swc]: https://swc-project.github.io/
[swc-visitor]: https://swc-project.github.io/docs/usage-plugin
