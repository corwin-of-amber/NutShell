
class Command {
    argv: string[]

    constructor(argv: string[]) { this.argv = argv; }

    static parse(text: string) {
        return new Command(text.split(/\s+/).filter(x => x)) /** @todo as if */
    }
}


export { Command }