import { EditorState, EditorView } from "@codemirror/basic-setup"
import { defaultKeymap } from "@codemirror/commands"
import { keymap } from "@codemirror/view";
import { Decoration, WidgetType } from '@codemirror/view';
import { DecorationPlugin } from './base';

import type { ShellState } from '../term';

// @ts-ignore
import PromptComponent from './prompt.vue'
import Vue from 'vue';

import { ShellExpansion } from '../facets/expansion';
import { CompletionPlugin } from '../facets/completion';


const prompts = new DecorationPlugin,
      outputs = new DecorationPlugin;

class CommandLineEditor extends EditorView {
    shellState: ShellState

    constructor(shellCommands: any) {
        super({
            state: EditorState.create({
              extensions: [shellCommands, keymap.of(defaultKeymap),
                prompts.field, outputs.field,
                CompletionPlugin.extension]
            }),
            parent: document.body
        });
    }

    makePrompt(shellState: ShellState, pos: number = this.state.selection.main.head) {
        var widget = new PromptWidget(shellState),
            d = Decoration.widget({widget, side: -1}).range(pos);
        this.shellState = shellState;
        return {effects: prompts.add.of([d]), scrollIntoView: true};
    }

    get command() {
        return this.state.doc.sliceString(0);
    }
}



type PromptComponent = Vue & {cwd: string, $el: HTMLElement}

class PromptWidget extends WidgetType {
    state: ShellState
    expand = new ShellExpansion
    vue: PromptComponent

    constructor(state: ShellState) { super(); this.state = state; }

    toDOM(view: EditorView): HTMLElement {
        this.vue = new Vue(PromptComponent) as PromptComponent
        this.vue.cwd = this.cwd;
        return this.vue.$mount().$el;
    }

    get cwd() {
        return this.expand.undirectory(this.state.cwd);
    }
}


export { CommandLineEditor, PromptWidget }