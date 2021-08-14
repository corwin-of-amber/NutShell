import path from 'path';
import $ from 'jquery';

import { EditorState, EditorView } from "@codemirror/basic-setup"
import { keymap } from "@codemirror/view";

import { Command } from './syntax/command';
import { CompletionPlugin } from './facets/completion';
import { FileSuggestionBox } from './facets/completion/files';
import { PtySubprocessJob, XtermOutputWidget } from './facets/jobs';

import { CommandLineEditor } from './components/command-line';

import './term.css';



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

    static clearInteraction(state: EditorState) {
        return {effects: CompletionPlugin.interaction.set.of([])};
    }
}


class ShellCommands {
    static makePrompt(shellState: ShellState) {
        let cm = new CommandLineEditor(shellKeys);
        cm.dispatch(cm.makePrompt(shellState));
        return cm;
    }

    static execLine(cm: CommandLineEditor) {
        var shellState = cm.shellState,
            cmd = cm.command;
        if (shellState) {
            ShellCommands.clearInteraction(cm);
            cm.dispatch(cm.state.replaceSelection("↵"));
            shellState = ShellCommands.execCommand(cm, shellState, 
                            Command.parse(cmd || "ls -1 /" /** @todo remove this */));
            ShellCommands.makePrompt(shellState).focus();
            return true;
        }
        else return false;
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
        var job = new PtySubprocessJob(shellState, command),
            out = new XtermOutputWidget();
        job.start();
        job.attach(out);
        out.$el.insertAfter(cm.dom);
        /** @todo this seems to work by some magic */
        out.term.onLineFeed(() => cm.dom.scrollIntoView());
        return shellState;
    }

    static completionStart(cm: CommandLineEditor) {
        if (CompletionPlugin.box instanceof FileSuggestionBox)
            CompletionPlugin.box.state = cm.shellState;
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





function main() {
    let shellState = new ShellState;
    shellState.cwd = process.cwd();

    var cm = ShellCommands.makePrompt(shellState);
    cm.focus();

    CompletionPlugin.box = new FileSuggestionBox();

    Object.assign(window, {cm,
        ShellState, ShellCommands, CompletionPlugin});
}

$(main);