{
    class Foo {}

    function stringOrBoolean(): string | boolean {
        return true;
    }

    function stringOrUndefined(): string {
        return undefined;
    }

    function stringOrClass(): string {
        return new Foo();
    }

    function stringOrFunction(): string {
        return () => {};
    }
}
