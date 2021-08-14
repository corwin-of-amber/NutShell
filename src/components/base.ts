import { StateField, StateEffect, Transaction } from '@codemirror/state';
import { EditorView, Decoration, DecorationSet } from '@codemirror/view';
import { Range, RangeSet } from '@codemirror/rangeset';


/**
 * Boilerplate for a state plugin that provides decorations.
 */
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
            value = this.effect(value, effect);
        }
        return value
    }

    effect(value: DecorationSet, effect: StateEffect<any>) {
        if (effect.is(this.add))
            value = value.update({add: effect.value})
        else if (effect.is(this.set))
            value = RangeSet.of(effect.value);
        return value;
    }
}


export { DecorationPlugin }