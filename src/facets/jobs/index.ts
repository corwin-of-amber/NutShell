import child_process from 'child_process';
import $ from 'jquery';

import pty from 'node-pty';  /* @kremlin.native */

import { EditorView, WidgetType } from '@codemirror/view';
import { Terminal, ITerminalOptions } from 'xterm';
import 'xterm/css/xterm.css';

import { Command } from '../../syntax/command';
import { ShellState } from '../../term';



abstract class SubprocessJob {
    state: ShellState
    command: Command;

    constructor(state: ShellState, command: Command) {
        this.state = state;
        this.command = command;
    }

    abstract start(): void;
    abstract attach(out: OutputWidget): void;
}

class ChildSubprocessJob extends SubprocessJob {
    proc: child_process.ChildProcess

    start() {
        var c = this.command;
        this.proc = child_process.spawn(c.argv[0], c.argv.slice(1), {
            cwd: this.state.cwd,
            stdio: 'pipe'
        });
    }

    attach(out: OutputWidget) {
        this.proc.stdout.on('data', (buf) => out.push(buf));
        this.proc.stderr.on('data', (buf) => out.push(buf));
    }
}

class PtySubprocessJob extends SubprocessJob {
    proc: pty.IPty

    start() {
        var c = this.command;
        this.proc = pty.spawn(c.argv[0], c.argv.slice(1), {
            cwd: this.state.cwd,
        });
    }

    attach(out: OutputWidget) {
        this.proc.on('data', (buf) => out.push(buf));
    }
}

interface OutputWidget {
    push(data: string | Uint8Array): void;
}


class CodeMirrorOutputWidget extends WidgetType implements OutputWidget {
    $el: JQuery
    text: string = ""
    view: EditorView

    toDOM(view: EditorView): HTMLElement {
        this.view = view;
        this.$el = $('<div>').addClass('shell--output').text(this.text);
        return this.$el[0];
    }

    push(data: Uint8Array) {
        var dt = new TextDecoder().decode(data);
        this.text += dt;
        this.$el[0].textContent += dt;
        // notify view
        this.view.dispatch(this.view.state.update(
            {scrollIntoView: true}  /** @todo only scroll if prompt was visible before */
        ));
    }
}

class XtermOutputWidget implements OutputWidget {
    term: Terminal
    maxLines: number = 25

    TERMINAL_STYLE: ITerminalOptions = {
        fontSize: 13,
        allowTransparency: true,
        theme: {
            background: 'transparent',
            foreground: 'black'
        }
    }

    constructor(container = document.createElement('div')) {
        this.term = new Terminal({rendererType: 'dom', rows: 1, 
            ...this.TERMINAL_STYLE});
        this.term.open(container);
        
        this.term.onLineFeed((ev) =>
            this.term.resize(this.term.cols,
                Math.min(this.maxLines, this.term.buffer.active.length)));
    }

    get $el() { return $(this.term.element); }

    push(data: Uint8Array) {
        this.term.write(data);
    }
}


export { SubprocessJob, ChildSubprocessJob, PtySubprocessJob,
         OutputWidget, CodeMirrorOutputWidget, XtermOutputWidget }