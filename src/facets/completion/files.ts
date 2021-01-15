import fs from 'fs';
import { SuggestionBox } from '.';
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
                      .map(nm => ({text: nm, for: basePrefix}));
    }
}


export { FileSuggestionBox }