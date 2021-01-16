import fs from 'fs';
import path from 'path';
import { CompletionSuggestion, SuggestionBox } from '.';
import { ShellExpansion } from '../expansion';


class FileSuggestionBox implements SuggestionBox {
    cwd: string = '.'
    expand = new ShellExpansion

    suggestFor(prefix: string) {
        var dir: string, basePrefix: string;
        if (prefix) {
            var mo = prefix.match(/^(.*)[/]([^/]*)$/);
            if (mo) { dir = mo[1]; basePrefix = mo[2]; }
            else { dir = '.'; basePrefix = prefix; }
        }
        else { dir = '.'; basePrefix = ''; }

        dir = this.expand.directory(dir);

        try { var entries = fs.readdirSync(dir); }
        catch { return []; }

        return entries.filter(nm => nm.startsWith(basePrefix))
                      .map(nm => ({for: basePrefix, ...this._suggest(dir, nm)}));
    }

    _suggest(dir: string, filename: string) {
        var v: CompletionSuggestion = {text: filename};
        try {
            var s = fs.statSync(path.join(dir, filename));
            v.follow = s.isDirectory() ? '/' : ' ';
        }
        catch { /* file not found - no follow */ }
        return v;
    }
}


export { FileSuggestionBox }