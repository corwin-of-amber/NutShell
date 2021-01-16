import $ from 'jquery';
import { EditorState, EditorView, basicSetup } from "@codemirror/basic-setup"
import { keymap } from "@codemirror/view";
import { Decoration, WidgetType } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';

import { DecorationPlugin } from './base';
import { CompletionPlugin, CompletionSuggestion, 
         CompletionWidget} from './facets/completion';
import { FileSuggestionBox } from './facets/completion/files';

import './term.css';



const prompts = new DecorationPlugin,
      outputs = new DecorationPlugin;


class ShellState {
    static cursor(state: EditorState) { return state.selection.main.from; }

    static commandAt(state: EditorState, pos: number = ShellState.cursor(state)) {
        var line = state.doc.lineAt(pos);
        return {from: line.from, to: line.to}; /** @todo multi-line */
    }

    static makePrompt(state: EditorState, pos: number = ShellState.cursor(state)) {
        var d = Decoration.widget({widget: new PromptWidget, side: -1}).range(pos);
        return {effects: prompts.add.of([d]), scrollIntoView: true};
    }

    static makeOutput(state: EditorState, pos: number = ShellState.cursor(state)) {
        var d = Decoration.widget({widget: new OutputWidget, side: -2, block: true}).range(pos);
        return {effects: outputs.add.of([d])};
    }

    static clearInteraction(state: EditorState) {
        return {effects: CompletionPlugin.interaction.set.of([])};
    }
}


class ShellCommands {
    static makePrompt(cm: EditorView) {
        cm.dispatch(ShellState.makePrompt(cm.state));
    }

    static makeOutput(cm: EditorView) {
        cm.dispatch(ShellState.makeOutput(cm.state));
    }

    static execLine(cm: EditorView) {
        ShellCommands.clearInteraction(cm);
        cm.dispatch(cm.state.replaceSelection("↵"));
        ShellCommands.makeOutput(cm);
        cm.dispatch(cm.state.replaceSelection("\n"));
        ShellCommands.makePrompt(cm);
        //ShellCommands.makeCompletions(cm);
        return true;
    }

    static clearInteraction(cm: EditorView) {
        cm.dispatch(ShellState.clearInteraction(cm.state));
        return true;
    }
}

export { ShellState, ShellCommands }

const shellKeys = keymap.of([
    { key: "Enter", run: ShellCommands.execLine },
    { key: "Tab", run: CompletionPlugin.commands.start },
    { key: "Escape", run: ShellCommands.clearInteraction }
]);


class PromptWidget extends WidgetType {
    toDOM(view: EditorView): HTMLElement {
        return $('<span>').addClass('shell--prompt').text('# ')[0];
    }
}

import fs from 'fs';

class OutputWidget extends WidgetType {
    toDOM(view: EditorView): HTMLElement {
        var out = fs.readFileSync('src/term.ts', 'utf-8');
        return $('<div>').addClass('shell--output').text(out.slice(0, 200))[0];
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

    ShellCommands.makePrompt(cm);
    cm.focus();

    CompletionPlugin.box = new FileSuggestionBox();

    Object.assign(window, {cm});
}

$(main);