const JsModulesPlugin = require("webpack/lib/javascript/JavascriptModulesPlugin");
const Compilation = require("webpack/lib/Compilation");
const { ConcatSource } = require("webpack-sources");

const logMe = (name, args) => console.log(name, ...args);

// A JavaScript class.
class DebuggerPlugin {
    constructor({ emitHookComments = true, logHookArgs = true }) {
        this.emitHookComments = emitHookComments;
        this.logHookArgs = logHookArgs;
    }

    // Define `apply` as its prototype method which is supplied with compiler as its argument
    apply(compiler) {
        const name = "DebuggerPlugin";
        // Specify the event hook to attach to
        compiler.hooks.compilation.tap(name, (compilation) => {
            const hooks = JsModulesPlugin.getCompilationHooks(compilation);

            hooks.renderModuleContent.tap(name, (source, module, renderContexts) => {
                debugger;
                this.logHookArgs &&
                    console.log("source, module, renderContexts", source, module, renderContexts);
                if (!this.emitHookComments) return source;
                return new ConcatSource("\n//[ModuleContent]\n", source, "\n//[/ModuleContent]\n");
            });

            hooks.renderModuleContainer.tap(name, (source, module, renderContexts) => {
                debugger;
                this.logHookArgs &&
                    console.log("source, module, renderContexts", source, module, renderContexts);
                if (!this.emitHookComments) return source;
                return new ConcatSource(
                    "\n//[ModuleContainer]\n",
                    source,
                    "\n//[/ModuleContainer]\n"
                );
            });

            hooks.renderModulePackage.tap(name, (source, module, renderContexts) => {
                debugger;
                this.logHookArgs &&
                    console.log("source, module, renderContexts", source, module, renderContexts);
                if (!this.emitHookComments) return source;
                return new ConcatSource("\n//[ModulePackage]\n", source, "\n//[/ModulePackage]\n");
            });

            hooks.renderChunk.tap(name, (source, renderContexts) => {
                debugger;
                this.logHookArgs && console.log("source, renderContexts", source, renderContexts);
                if (!this.emitHookComments) return source;
                return new ConcatSource("\n//[Chunk]\n", source, "\n//[/Chunk]\n");
            });

            hooks.renderMain.tap(name, (source, renderContexts) => {
                debugger;
                this.logHookArgs && console.log("source, renderContexts", source, renderContexts);
                if (!this.emitHookComments) return source;
                return new ConcatSource("\n//[Main]\n", source, "\n//[/Main]\n");
            });

            hooks.renderRequire.tap(name, (code, renderContexts) => {
                debugger;
                this.logHookArgs && console.log("code, renderContexts", code, renderContexts);
                if (!this.emitHookComments) return code;
                return "\n//[Require]\n" + code + "\n//[/Require]\n";
            });
        });
    }
}

module.exports = DebuggerPlugin;
