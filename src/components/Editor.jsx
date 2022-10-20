import React from "react";
import ReactDOM from "react-dom/client";
import ObjPath from "object-path";

import * as Acorn from "acorn";

import { generate as generateJs } from "escodegen";
import { transform as babelTransform } from "@babel/standalone";

function isReactNode(node) {
    const type = node.type; //"ExpressionStatement"
    const obj = ObjPath.get(node, "expression.callee.object.name");
    const func = ObjPath.get(node, "expression.callee.property.name");
    return (
        type === "ExpressionStatement" &&
        obj === "React" &&
        func === "createElement"
    );
}

export function findReactNode(ast) {
    const { body } = ast;
    return body.find(isReactNode);
}

export function createEditor(domElement, moduleResolver = () => null) {
    function render(node) {
        const root = ReactDOM.createRoot(domElement)
        root.render(
            <React.StrictMode>
                {node}
            </React.StrictMode>
        )
    }

    function require(moduleName) {
        return moduleResolver(moduleName);
    }

    function getWrapperFunction(code) {
        try {
            // 1. transform code
            const tcode = babelTransform(code, { presets: ["es2015", "react"] })
                .code;

            console.log('tcode', tcode)

            // 2. get AST
            const ast = Acorn.parse(tcode, {
                sourceType: "module"
            });
            console.log('ast -->', ast)

            // 3. find React.createElement expression in the body of program
            const rnode = findReactNode(ast);

            console.log('rnode -->', rnode)

            if (rnode) {
                const nodeIndex = ast.body.indexOf(rnode);
                // 4. convert the React.createElement invocation to source and remove the trailing semicolon
                const createElSrc = generateJs(rnode).slice(0, -1);
                console.log('createElSrc -->', createElSrc)

                // 5. transform React.createElement(...) to render(React.createElement(...)),
                // where render is a callback passed from outside
                const renderCallAst = Acorn.parse(`render(${createElSrc})`)
                    .body[0];
                console.log('renderCallAst -->', renderCallAst)


                ast.body[nodeIndex] = renderCallAst;
            }

            // 6. create a new wrapper function with all dependency as parameters
            return new Function("React", "render", "require", generateJs(ast));
        } catch (ex) {
            // in case of exception render the exception message
            render(<pre style={{ color: "red" }}>{ex.message}</pre>);
            return (...arg) => {
                console.log('err', arg)}
        }
    }

    return {
        // returns transpiled code in a wrapper function which can be invoked later
        compile(code) {
            return getWrapperFunction(code);
        },

        // compiles and invokes the wrapper function
        run(code) {
            console.log('in run', this)
            this.compile(code)(React, render, require);
        },

        // just compiles and returns the stringified wrapper function
        getCompiledCode(code) {
            return getWrapperFunction(code).toString();
        }
    };
}