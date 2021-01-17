import assert from 'assert';
import path from 'path';
import $ from 'jquery';

import { EditorState, EditorView, basicSetup } from "@codemirror/basic-setup"
import { keymap } from "@codemirror/view";
import { Decoration, WidgetType } from '@codemirror/view';

import { DecorationPlugin } from './base';
import { Command } from './syntax/command';
import { CompletionPlugin } from './facets/completion';
import { FileSuggestionBox } from './facets/completion/files';
import { SubprocessJob, OutputWidget } from './facets/jobs';

import './term.css';



const prompts = new DecorationPlugin,
      outputs = new DecorationPlugin;


class ShellState {
    cwd: string

    clone() {
        return Object.assign(new ShellState, this);
    }

    cd(dir: string) {
        var c = this.clone();
        c.cwd = path.resolve(this.cwd, dir);
        return c;
    }

    static cursor(state: EditorState) { return state.selection.main.head; }

    static commandAt(state: EditorState, pos: number = ShellState.cursor(state)) {
        var line = state.doc.lineAt(pos);
        return {from: line.from, to: line.to}; /** @todo multi-line */
    }

    static promptAt(state: EditorState, pos: number = ShellState.cursor(state)) {
        var {from} = ShellState.commandAt(state, pos), prompt: PromptWidget;
        state.field(prompts.field).between(from, from + 1, (f, t, d) => {
            var w = d.spec?.widget;
            if (w instanceof PromptWidget) {
                /**/ assert(!prompt); /**/
                prompt = w;
            }
        });
        return prompt;
    }

    static stateAt(state: EditorState, pos: number = ShellState.cursor(state)) {
        return ShellState.promptAt(state, pos)?.state;
    }

    makePrompt(state: EditorState, pos: number = ShellState.cursor(state)) {
        var widget = new PromptWidget(this),
            d = Decoration.widget({widget, side: -1}).range(pos);
        return {effects: prompts.add.of([d]), scrollIntoView: true};
    }

    static makeOutput(state: EditorState, pos: number = ShellState.cursor(state)) {
        var widget = new OutputWidget,
            d = Decoration.widget({widget, side: -2, block: true}).range(pos);
        return {widget, tr: {effects: outputs.add.of([d])}};
    }

    static clearInteraction(state: EditorState) {
        return {effects: CompletionPlugin.interaction.set.of([])};
    }
}


class ShellCommands {
    static makePrompt(cm: EditorView, shellState: ShellState) {
        cm.dispatch(shellState.makePrompt(cm.state));
    }

    static makeOutput(cm: EditorView) {
        var {widget, tr} = ShellState.makeOutput(cm.state);
        cm.dispatch(tr);
        return widget;
    }

    static execLine(cm: EditorView) {
        var shellState = ShellState.stateAt(cm.state)!,
            range = ShellState.commandAt(cm.state),
            cmd = cm.state.doc.sliceString(range.from, range.to);
        ShellCommands.clearInteraction(cm);
        cm.dispatch(cm.state.replaceSelection("↵"));
        shellState = ShellCommands.execCommand(cm, shellState, 
                        Command.parse(cmd || "ls /"));
        cm.dispatch(cm.state.replaceSelection("\n"));
        ShellCommands.makePrompt(cm, shellState);
        return true;
    }

    static execCommand(cm: EditorView, shellState: ShellState, command: Command) {
        switch (command.argv[0]) {
        case "cd":
            return shellState.cd(command.argv[1] || process.env['HOME']);
        default:
            return ShellCommands.execSubprocess(cm, shellState, command);
        }
    }

    static execSubprocess(cm: EditorView, shellState: ShellState, command: Command) {
        var out = ShellCommands.makeOutput(cm);
        var job = new SubprocessJob(shellState, command);
        job.start();
        job.attach(out);
        return shellState;
    }

    static completionStart(cm: EditorView) {
        if (CompletionPlugin.box instanceof FileSuggestionBox)
            CompletionPlugin.box.state = ShellState.stateAt(cm.state)!;
        return CompletionPlugin.commands.start(cm);
    }

    static clearInteraction(cm: EditorView) {
        cm.dispatch(ShellState.clearInteraction(cm.state));
        return true;
    }
}

export { ShellState, ShellCommands }

const shellKeys = keymap.of([
    { key: "Enter", run: ShellCommands.execLine },
    { key: "Tab", run: ShellCommands.completionStart },
    { key: "Escape", run: ShellCommands.clearInteraction }
]);


class PromptWidget extends WidgetType {
    state: ShellState

    constructor(state: ShellState) { super(); this.state = state; }

    toDOM(view: EditorView): HTMLElement {
        return $('<span>').addClass('shell--prompt')
            .text(`${this.state.cwd} # `)[0];
    }
}


function main() {
    let cm = new EditorView({
        state: EditorState.create({
          extensions: [shellKeys, basicSetup,
            prompts.field, outputs.field,
            CompletionPlugin.extension]
        }),
        parent: document.body
    });

    let shellState = new ShellState;
    shellState.cwd = process.cwd();

    ShellCommands.makePrompt(cm, shellState);
    cm.focus();

    CompletionPlugin.box = new FileSuggestionBox();

    Object.assign(window, {cm, prompts, outputs, ShellState, ShellCommands, CompletionPlugin});
}

$(main);