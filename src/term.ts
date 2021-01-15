import $ from 'jquery';
import { EditorState, EditorView, basicSetup } from "@codemirror/basic-setup"
import { keymap } from "@codemirror/view";
import { Decoration, DecorationSet, Range, WidgetType } from '@codemirror/view';
import { StateField, StateEffect, EditorSelection } from '@codemirror/state';

import { CompletionPlugin, completionPlugin, 
         CompletionSuggestion } from './facets/completion';
import { FileSuggestionBox } from './facets/completion/files';



const addDeco = StateEffect.define<Range<Decoration>[]>()

function decos(startState: DecorationSet = Decoration.none) {
    let field = StateField.define<DecorationSet>({
        create() { return startState },
        update(value, tr) {
            value = value.map(tr.changes)
            for (let effect of tr.effects) {
                if (effect.is(addDeco)) value = value.update({add: effect.value})
            }
            return value
        },
        provide: f => EditorView.decorations.from(f)
    })
    return [field]
}


class ShellState {
    static cursor(state: EditorState) { return state.selection.main.from; }

    static makePrompt(state: EditorState, pos: number = ShellState.cursor(state)) {
        var d = Decoration.widget({widget: new PromptWidget, side: -1}).range(pos);
        return {effects: addDeco.of([d]), scrollIntoView: true}
    }
    static makeOutput(state: EditorState, pos: number = ShellState.cursor(state)) {
        var d = Decoration.widget({widget: new OutputWidget, block: true}).range(pos);
        return {effects: addDeco.of([d])}
    }
    static completionApply(state: EditorState, selected: CompletionSuggestion) {
        let sel = state.selection.main,
            before = selected.for, after = selected.text;
        if (before) sel = sel.extend(sel.from - before.length);
        return state.update({
            changes: [{...sel, insert: after}],
            selection: EditorSelection.cursor(sel.from + after.length)
        });
    }
}

class ShellCommands {
    static makePrompt(cm: EditorView) {
        cm.dispatch(ShellState.makePrompt(cm.state));
        return true;
    }

    static makeOutput(cm: EditorView) {
        cm.dispatch(ShellState.makeOutput(cm.state));
        return true;
    }

    static execLine(cm: EditorView) {
        cm.dispatch(cm.state.replaceSelection("\n"));
        ShellCommands.makeOutput(cm);
        ShellCommands.makePrompt(cm);
        return true;
    }

    static completionFirst(cm: EditorView) {
        var s = CompletionPlugin.widget.items[0];
        if (s) {
            cm.dispatch(ShellState.completionApply(cm.state, s));
        }
        return !!s;
    }
}

const shellKeys = keymap.of([
    { key: "Enter", run: ShellCommands.execLine },
    { key: "Tab", run: ShellCommands.completionFirst }
]);


class PromptWidget extends WidgetType {
    toDOM(view: EditorView): HTMLElement {
        return $('<span>').text('# ')[0];
    }
}

import fs from 'fs';

class OutputWidget extends WidgetType {
    toDOM(view: EditorView): HTMLElement {
        var out = fs.readFileSync('src/term.ts', 'utf-8');
        return $('<div>').text(out)[0];
    }
}



function main() {
    let cm = new EditorView({
        state: EditorState.create({
          extensions: [shellKeys, basicSetup, completionPlugin, decos()]
        }),
        parent: document.body
    });

    ShellCommands.makePrompt(cm);
    cm.focus();

    CompletionPlugin.box = new FileSuggestionBox();

    // This static member is initialized as part of the completionPlugin
    // setup...
    document.body.append(CompletionPlugin.widget.$mount().$el);

    Object.assign(window, {cm});
}

$(main);