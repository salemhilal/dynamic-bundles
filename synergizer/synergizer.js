/**
 * This script takes a bunch of modules built with webpack and merges them, deduplicating
 * modules as it makes sense. There are a few restrictions:
 *      - Webpack's runtime has to be in its own file (for now)
 *      - Webpack's optimization.concatenateModules has to be set to false
 */
const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const j = require("jscodeshift");
const style = { bold: "\033[1m", reset: "\033[0m" };
const { argv } = require("yargs")
    .version("version", "Show the version number.")
    .help("help", "Show this message.")
    .command(
        "$0 <files..>",
        `${style.bold}Synergize:${style.reset} Optimally concatenate Webpack-built files.`,
        (yargs) => {
            yargs.positional("files", {
                describe: "What files should I merge?",
                type: "array",
                coerce: (files) => files.map((file) => path.resolve(file)),
            });
        }
    )
    .option("o", {
        alias: "output",
        describe:
            "Where do you want me to put the output?\nLeave this unset and I'll just log the output to stdout.",
        type: "string",
        coerce: (file) => path.resolve(file),
    })
    .option("v", {
        alias: "verbose",
        describe: "If set, I'll let you know what's goin on under the hood.",
        type: "boolean",
        default: false,
    })
    .option("b", {
        alias: "build-only",
        desribe: "If set, I'll skip outputting the results (both to stdout or to a file)",
        type: "boolean",
        default: false,
    });

/**
 * Log helper that logs info-level logs if the verbose flag is on
 * @param  {...any} args - Passed directly to console.log
 */
const log = (...args) => argv.v && console.log(...args);

/**
 *
 * @param {Collection} ast - jscodeshift AST representation of the input file
 * @return {Node|undefined} = an ObjectExpression node, or undefined
 */
const astToModuleMapPath = (ast) => {
    return (
        ast
            // We want any object...
            .find(j.ObjectExpression)
            // That's in an array that's an argument to `[something].push()`.
            // TODO: We could be more specific by making sure it's the right distance from the
            // File or the Program scope.
            .filter((p) => {
                try {
                    return (
                        // We want to find the object that's in the array that's passed to `.push`
                        // Here's what all these `.parentPath` calls are for:
                        // Obj -> array values -> ArrayExpression -> call arguments -> CallExpressions
                        p.parentPath.parentPath.parentPath.parentPath.value.callee.property.name ===
                            "push" &&
                        // Going further: -> ExpressionStatement -> Program body -> Program
                        p.parentPath.parentPath.parentPath.parentPath.parentPath.parentPath
                            .parentPath.value.type === "Program"
                    );
                } catch (e) {
                    return false;
                }
            })
            // Return AST paths
            .paths()
            // Get the first element, or undefined if there are no elements
            .find(Boolean)
    );
};

/**
 * And this is where the magic happens
 */
log(
    `\nI'm merging these files together:\n${argv.files
        .map((fileName) => `  →  ${fileName}`)
        .join("\n")}\n`
);

// Show me a better way / promise I'll quit this game
Array.prototype.__sideEffect = function (cb) {
    cb(this);
    return this;
};

const startTime = Date.now();
let astTime = 0;
let transformTime = 0;

Promise.all(argv.files.map((file) => readFile(file)))
    .then((buffers) => {
        const output = buffers
            .map((buffer) => buffer.toString())
            // Turn the sources into ASTs
            .map((source) => j(source))
            .__sideEffect((arr) => {
                astTime = Date.now();
                log(`  ⧗  ASTs for ${arr.length} files generated in ${astTime - startTime}ms`);
            })
            // Get the path to the webpack module object, and the
            // path to its properties, for each AST.
            .map((ast) => {
                const modulePath = astToModuleMapPath(ast);
                const moduleProps = modulePath.get("properties");
                return { ast, modulePath, moduleProps };
            })
            // For each AST, iterate over all of its modules.
            // If we see a module that's been loaded previously, remove it.
            .__sideEffect(() =>
                log("     ┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅")
            )
            .reduce(
                ({ seen, filtered }, { ast, modulePath, moduleProps }) => {
                    // TODO: It'd be great for logging to pass the name of the file through.
                    const filteredPropPaths = moduleProps.filter((path) => {
                        const propName = path.get("key").value.value;
                        if (seen.has(propName)) {
                            log(`  ✘  I've seen this module, so I'm removing it: ${propName}`);
                            return false;
                        }
                        log(`  ✔  I'm seeing this module for the first time: ${propName}`);
                        seen.add(propName);
                        return true;
                    });
                    filtered.push({ filteredPropPaths, modulePath, ast });
                    log("     ┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅");
                    return { seen, filtered };
                },
                { seen: new Set(), filtered: [] }
            )
            // Take the filtered properties, construct a new object, and
            // replace the original Webpack module object. Finally, convert
            // the corresponding AST back into sourcecode.
            .filtered.map(({ ast, filteredPropPaths, modulePath }) => {
                const filteredProps = filteredPropPaths.map((path) => path.value);
                modulePath.replace(j.objectExpression(filteredProps));
                const source = ast.toSource();
                return source;
            })
            .__sideEffect(() => {
                transformTime = Date.now();
                log(`  ⧗  Transforms completed in ${transformTime - astTime}ms`);
            })
            .join("");

        // TODO: I'm returning stuff here because it'd be chill to make all this
        // accessible as a module, not just a CLI. But obviously I'm returning
        // this to nothing right now, kinda like playing catch with a brick wall.
        // At some point, splitting up the CLI and the core logic might be a cool idea.

        const buildFinishTime = Date.now();
        log(
            `\n  ⧗  ${style.bold}Time from old source to new source: ${
                buildFinishTime - startTime
            }ms${style.reset}`
        );

        // If --build-only is set, don't output anything
        if (argv.b) {
            return output;
        }

        // If an output file is set, write to it.
        // Either way, return the output.
        if (argv.o) {
            return writeFile(argv.o, output).then(() => {
                log(`Output file written in ${Date.now() - buildFinishTime}ms`);
                output;
            });
        } else {
            process.stdout.write(output);
            return output;
        }
    })
    .catch((e) => console.error(e));
