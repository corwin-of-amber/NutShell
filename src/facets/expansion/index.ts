

class ShellExpansion {
    directory(direxpr: string) {
        // ~ -> home
        var mo = direxpr.match(/^~(|[/].*)$/);
        if (mo) return this.home + mo[1];

        return direxpr;
    }

    get home() {
        return process.env['HOME'];
    }
}


export { ShellExpansion }