/**
 * This file does dumb shit as of right now, but eventually I hope it
 * dedupes modules across a few webpack files and concats them together.
 */
const fs = require("fs");
const { promisify } = require("util");
const readFile = promisify(fs.readFile);
const j = require("jscodeshift");

// TODO: use yargs
// TODO: take more than one file as an argument lol
const targetFile = process.argv[2];
if (!targetFile) {
    console.log(`Invalid target file. Expected syntax: node ${process.argv[1]} <targetFile>`);
    process.exit(1);
}

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
readFile(targetFile)
    .then((buffer) => {
        // const ast = parse(buffer.toString());
        // console.log("result", ast);
        // const output = print(ast);
        // console.log("code", output.code);
        const ast = j(buffer.toString());
        const modulePath = astToModuleMapPath(ast);
        const moduleProps = modulePath.get("properties");
        // Get a new list of props
        const filteredPropPaths = moduleProps.filter((path) => {
            if (path.get("key").value.value === "./src/a.js") {
                return false;
            }
            return true;
        });
        // Convert paths to nodes. There's probably a cuter way to do this but w/e
        const filteredProps = filteredPropPaths.map((path) => path.value);
        // Make a new module map, and replace the old one
        modulePath.replace(j.objectExpression(filteredProps));
        // TODO: Uh do somethin with this
        console.log(ast.toSource());
    })
    .catch((e) => console.error(e));
