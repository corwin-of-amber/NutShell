

class ShellExpansion {
    directory(direxpr: string) {
        // ~ -> home
        var mo = direxpr.match(/^~(|[/].*)$/);
        if (mo) return this.home + mo[1];

        return direxpr;
    }

    undirectory(dir: string) {
        var home = this.home;
        if (dir == home) return '~';
        else if (dir.startsWith(home + '/'))
            return '~' + dir.slice(home.length);
        else
            return dir;
    }

    get home() {
        return process.env['HOME'];
    }
}


export { ShellExpansion }