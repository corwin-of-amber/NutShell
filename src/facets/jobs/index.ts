import fs from 'fs';
import child_process from 'child_process';
import $ from 'jquery';

import { EditorView, WidgetType } from '@codemirror/view';

import { Command } from '../../syntax/command';
import { ShellState } from '../../term';



class SubprocessJob {
    state: ShellState
    command: Command;
    proc: child_process.ChildProcess

    constructor(state: ShellState, command: Command) {
        this.state = state;
        this.command = command;
    }

    start() {
        var c = this.command;
        /** @todo really need pty (perhaps not always?) */
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


class OutputWidget extends WidgetType {
    $el: JQuery
    view: EditorView

    toDOM(view: EditorView): HTMLElement {
        this.view = view;
        this.$el = $('<div>').addClass('shell--output');
        return this.$el[0];
    }

    push(data: Uint8Array) {
        this.$el[0].textContent += new TextDecoder().decode(data);
        // notify view
        this.view.dispatch(this.view.state.update(
            {scrollIntoView: true}  /** @todo only scroll if prompt was visible before */
        ));
    }
}



export { SubprocessJob, OutputWidget }