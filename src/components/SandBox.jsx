import "./sandbox.css";
import React from "react";
import ReactDOM from "react-dom";
import { createEditor } from "./editor";
import debounce from "debounce";

// default code
const code = `import x from 'x';

// edit this example

function Greet() {
  return <span>Hello World!</span>
}

<Greet />
`;


export class SandBox extends React.Component {
    state = {
        code
    };

    editor = null;

    el = null;

    componentDidMount() {
        this.editor = createEditor(this.el);
        console.log(this.editor)
        this.editor.run(code);
    }

    onCodeChange = ({ target: { value } }) => {
        this.setState({ code: value });
        this.run(value);
    };

    run = debounce(() => {
        const { code } = this.state;
        this.editor.run(code);
    }, 500);

    render() {
        const { code } = this.state;
        return (
            <div className="app">
                <div className="split-view">
                    <div className="code-editor">
                        <textarea value={code} onChange={this.onCodeChange} />
                    </div>
                    <div className="preview" ref={el => (this.el = el)} />
                </div>
            </div>
        );
    }
}