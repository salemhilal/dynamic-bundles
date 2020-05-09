/**
 * This file does dumb shit as of right now, but eventually I hope it
 * dedupes modules across a few webpack files and concats them together.
 */
const fs = require("fs");
const { promisify } = require("util");
const readFile = promisify(fs.readFile);
const j = require("jscodeshift");
const { argv } = require("yargs");

// TODO: use yargs
// TODO: take more than one file as an argument lol
const targetFiles = argv._;
if (targetFiles.length < 1) {
    console.log(`Invalid target file. Expected syntax: node ${argv.$0} <targetFile ...>`);
    process.exit(1);
}
// const targetFile = targetFiles[0];
console.log("targets:", targetFiles.join(", "));
const targetFile = targetFiles[0];
const moduleMap = {};
const setModule = (name) => {
    moduleMap[name] = true;
};
const getModule = (name) => moduleMap[name] || false;

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
            // That's an argument to `push()`.
            .filter((p) => {
                try {
                    return (
                        // We want to find the object that's in the array that's passed to `.push`
                        // We could be more specific by making sure it's the right distance from the
                        // File or the Program scope. Here's what all these `.parentPath` calls are for:
                        // Obj -> array values -> ArrayExpression -> call arguments -> CallExpressions
                        p.parentPath.parentPath.parentPath.parentPath.value.callee.property.name ===
                        "push"
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

console.log(`Synergizing ${targetFile}`);
Promise.all(targetFiles.map((file) => readFile(file)))
    .then((buffers) => {
        const output = buffers
            .map((buffer) => buffer.toString())
            .map((source) => j(source))
            .map((ast) => {
                const modulePath = astToModuleMapPath(ast);
                const moduleProps = modulePath.get("properties");
                return { ast, modulePath, moduleProps };
            })
            .reduce(
                ({ seen, filtered }, { ast, modulePath, moduleProps }) => {
                    const filteredPropPaths = moduleProps.filter((path) => {
                        const propName = path.get("key").value.value;
                        if (seen.has(propName)) {
                            console.log(`Already seen module ${propName}`);
                            return false;
                        }
                        console.log(`Adding ${propName}`);
                        seen.add(propName);
                        return true;
                    });
                    filtered.push({ filteredPropPaths, modulePath, ast });
                    return { seen, filtered };
                },
                { seen: new Set(), filtered: [] }
            )
            .filtered.map(({ ast, filteredPropPaths, modulePath }) => {
                const filteredProps = filteredPropPaths.map((path) => path.value);
                modulePath.replace(j.objectExpression(filteredProps));
                const source = ast.toSource();
                console.log("====================\n\n", source);
                return source;
            })
            .join();
    })
    .catch((e) => console.error(e));
