import $ from 'jquery';
import { EditorState, EditorView, basicSetup } from "@codemirror/basic-setup"
import { keymap } from "@codemirror/view";
import { Decoration, DecorationSet, Range, WidgetType } from '@codemirror/view';
import { RangeSet } from '@codemirror/rangeset';
import { StateField, StateEffect, EditorSelection,
         Transaction } from '@codemirror/state';

import { CompletionPlugin, completionPlugin, 
         CompletionSuggestion, 
         CompletionWidget} from './facets/completion';
import { FileSuggestionBox } from './facets/completion/files';

import './term.css';



class DecorationPlugin {
    readonly add = StateEffect.define<Range<Decoration>[]>()
    readonly set = StateEffect.define<Range<Decoration>[]>()

    readonly field: StateField<DecorationSet>

    constructor(startState: DecorationSet = Decoration.none) {
        let self = this;
        this.field = StateField.define<DecorationSet>({
            create() { return startState },
            update(value, tr) { return self.update(value, tr); },
            provide: f => EditorView.decorations.from(f)
        });
    }

    update(value: DecorationSet, tr: Transaction) {
        value = value.map(tr.changes)
        for (let effect of tr.effects) {
            if (effect.is(this.add))
                value = value.update({add: effect.value})
            else if (effect.is(this.set))
                value = RangeSet.of(effect.value);
        }
        return value
    }
}

const prompts = new DecorationPlugin,
      outputs = new DecorationPlugin,
      interaction = new DecorationPlugin;


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

    static makeCompletions(state: EditorState, pos: number = ShellState.cursor(state)) {
        var cmd = ShellState.commandAt(state, pos),
            nl = cmd.to == state.doc.length ? [{from: cmd.to, insert: '\n'}] : [],
            widget = CompletionPlugin.widget = new CompletionWidget,
            d = Decoration.widget({widget, block: true}).range(cmd.to + 1);
        return {changes: nl, effects: interaction.set.of([d])};
    }

    static completionApply(state: EditorState, selected: CompletionSuggestion) {
        let sel = state.selection.main,
            before = selected.for, after = selected.text;
        if (before) sel = sel.extend(sel.from - before.length);
        return state.update({
            changes: [{...sel, insert: after}],
            selection: EditorSelection.cursor(sel.from + after.length),
            scrollIntoView: true
        });
    }

    static clearInteraction(state: EditorState) {
        return {effects: interaction.set.of([])};
    }
}


class ShellCommands {
    static makePrompt(cm: EditorView) {
        cm.dispatch(ShellState.makePrompt(cm.state));
    }

    static makeOutput(cm: EditorView) {
        cm.dispatch(ShellState.makeOutput(cm.state));
    }

    static makeCompletions(cm: EditorView) {
        cm.dispatch(ShellState.makeCompletions(cm.state));
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

    static completionStart(cm: EditorView) {
        ShellCommands.makeCompletions(cm);
        ShellCommands.completionFirst(cm);
        return true;
    }

    static completionFirst(cm: EditorView) {
        var s = CompletionPlugin.widget.items[0];
        if (s) {
            cm.dispatch(ShellState.completionApply(cm.state, s));
        }
        return !!s;
    }

    static clearInteraction(cm: EditorView) {
        cm.dispatch(ShellState.clearInteraction(cm.state));
        return true;
    }
}

const shellKeys = keymap.of([
    { key: "Enter", run: ShellCommands.execLine },
    { key: "Tab", run: ShellCommands.completionStart },
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
    console.log("↵");
    let cm = new EditorView({
        state: EditorState.create({
          extensions: [shellKeys, basicSetup,
            prompts.field, outputs.field, interaction.field,
            completionPlugin]
        }),
        parent: document.body
    });

    ShellCommands.makePrompt(cm);
    cm.focus();

    CompletionPlugin.box = new FileSuggestionBox();

    Object.assign(window, {cm});
}

$(main);