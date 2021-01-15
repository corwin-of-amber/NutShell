import Vue from 'vue';
// @ts-ignore
import completionList from '../../components/completion-list.vue';



class CompletionWidget extends Vue {
    items: CompletionSuggestion[]

    constructor() {
        super(completionList);
    }
}

type CompletionSuggestion = {
    for?: string
    text: string
}


interface SuggestionBox {
    suggestFor(prefix: string): CompletionSuggestion[]
}

class NoSuggestionBox implements SuggestionBox {
    suggestFor(prefix: string) { return []; }
}


import {EditorView, ViewPlugin, ViewUpdate} from "@codemirror/view"


class CompletionPlugin {
    static widget: CompletionWidget
    static box: SuggestionBox = new NoSuggestionBox

    constructor(view: EditorView) {
    }

    get widget() {
        CompletionPlugin._init();
        return CompletionPlugin.widget!;
    }

    update(update: ViewUpdate) {
        const state = update.state;
        let at = state.selection.main.from,
            line = state.doc.lineAt(at),
            prefix = line.text.slice(0, at - line.from)
                     .match(/\S*$/)[0];
        
        this.widget.items = CompletionPlugin.box.suggestFor(prefix)
            .map(s => ({for: prefix, ...s}));
    }

    destroy() { }

    static _init() {
        CompletionPlugin.widget ||= new CompletionWidget();
    }
}

const completionPlugin = ViewPlugin.fromClass(CompletionPlugin);

export { CompletionWidget, CompletionSuggestion,
         CompletionPlugin, completionPlugin,
         SuggestionBox }