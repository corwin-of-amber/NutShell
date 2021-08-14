import Vue from 'vue';
// @ts-ignore
import completionList from '../../components/completion-list.vue';

import type { CommandLineEditor } from '../../components/command-line';



class CompletionList extends Vue {
    items: CompletionSuggestion[]
    $el: HTMLTableElement

    constructor() {
        super(completionList);
    }
    longestCommonPrefix() {
        switch (this.items.length) {
        case 0: return undefined;
        case 1: return this.items[0];
        default: 
            var v = this.items[0];
            return {for: v.for, text: v.text.slice(0, this.longestCommonPrefixLength())};
        }
    }

    longestCommonPrefixLength() {
        var cand = this.items.map(s => s.text),
            maxlen = Math.max(0, ...cand.map(s => s.length));
        for (let i = 0; i < maxlen; i++) {
            if (!cand.every(s => s[i] == cand[0][i])) return i;
        }
        return maxlen;
    }
}

type CompletionSuggestion = {
    for?: string
    text: string
    follow?: string
}


interface SuggestionBox {
    suggestFor(prefix: string): CompletionSuggestion[]
}

class NoSuggestionBox implements SuggestionBox {
    suggestFor(prefix: string) { return []; }
}


import { EditorState, EditorSelection } from '@codemirror/state';
import { EditorView, ViewPlugin, ViewUpdate,
         Decoration, WidgetType } from '@codemirror/view'
import { DecorationPlugin } from '../../components/base';


class CompletionWidget extends WidgetType {
    list = new CompletionList().$mount();

    get items() { return this.list.items; }
    set items(v: CompletionSuggestion[]) { this.list.items = v; }
    toDOM() { return this.list.$mount().$el; }
}

class CompletionPlugin {
    static widget: CompletionWidget
    static box: SuggestionBox = new NoSuggestionBox

    static readonly interaction = new DecorationPlugin

    constructor(view: EditorView) {
    }

    get widget() { return CompletionPlugin.widget; }

    update(update: ViewUpdate) {
        if (!this.widget) return;

        let isStarting = this._isStarting(update);

        if (isStarting || update.docChanged || update.selectionSet) {
            const state = update.state;
            let at = state.selection.main.from,
                line = state.doc.lineAt(at),
                prefix = line.text.slice(0, at - line.from)
                        .match(/\S*$/)[0];
            
            if (!isStarting && !prefix) {
                requestAnimationFrame(() => this.stop(update.view));
            }

            this.widget.items = CompletionPlugin.box.suggestFor(prefix)
                .map(s => ({for: prefix, ...s}));
        }
    }

    stop(view: EditorView) {
        view.dispatch({effects: CompletionPlugin.interaction.set.of([])});
    }

    _isStarting(update: ViewUpdate) {
        return update.transactions.some(tr =>
            tr.effects.some(eff => eff.is(CompletionPlugin.interaction.set)
                                   && eff.value.length > 0));
    }

    destroy() { }

    static extension = [ViewPlugin.fromClass(CompletionPlugin),
                        CompletionPlugin.interaction.field];

    static transactions: typeof CompletionState;
    static commands: typeof CompletionCommands;
}


class CompletionState {

    static show(state: EditorState) {
        var at = state.doc.length + 1,
            spc = [{from: state.doc.length, insert: ' '}],  /** @todo these spaces do pile up */
            widget = CompletionPlugin.widget = new CompletionWidget,
            d = Decoration.widget({widget, block: true}).range(at);
        return {changes: spc, effects: CompletionPlugin.interaction.set.of([d])};
    }

    static apply(state: EditorState, selected: CompletionSuggestion) {
        let sel = state.selection.main,
            before = selected.for,
            after = selected.text + (selected.follow || '');
        if (before) sel = sel.extend(sel.from - before.length);
        return state.update({
            changes: [{...sel, insert: after}],
            selection: EditorSelection.cursor(sel.from + after.length),
            scrollIntoView: true
        });
    }
}

class CompletionCommands {

    static show(cm: CommandLineEditor) {
        cm.dispatch(CompletionState.show(cm.state));
    }

    static start(cm: CommandLineEditor) {
        CompletionCommands.show(cm);
        CompletionCommands.longest(cm);
        return true;
    }

    static first(cm: EditorView) {
        var s = CompletionPlugin.widget.items[0];
        if (s) {
            cm.dispatch(CompletionState.apply(cm.state, s));
        }
        return !!s;
    }

    static longest(cm: EditorView) {
        var s = CompletionPlugin.widget.list.longestCommonPrefix();
        if (s && s.text) {
            cm.dispatch(CompletionState.apply(cm.state, s));
        }
        return !!s;
    }
}

CompletionPlugin.transactions = CompletionState;
CompletionPlugin.commands = CompletionCommands;


export { CompletionWidget, CompletionSuggestion,
         CompletionPlugin, SuggestionBox }