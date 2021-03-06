# Types

## `--typeAlias`/`aliases`

Object mapping names of added types to strings to replace them with.

For example, to replace `null` with `null /* TODO: check auto-generated types (thanks TypeStat!) */`:

```shell
typestat --typeAlias "null=null /* TODO: check added types (thanks TypeStat!) */"
```

```json
{
    "types": {
        "aliases": {
            "null": "null /* TODO: check added types (thanks TypeStat!) */"
        }
    }
}
```

Aliases are interpreted as case-sensitive regular expressions.
`{0}`s in value replacements will be replaced with the raw matched type.

One strategy is to create a global type alias in your code for each migration to make it _really_ clear these are temporary
_(and easier to find-all in your IDE)_:

```typescript
// typings.d.ts
type TodoAutoAdded_null = null;
type TodoAutoAdded_undefined = undefined;
```

```shell
typestat --typeAlias "null|undefined=TodoAutoAdded_{0}"
```

```json
{
    "types": {
        "aliases": {
            "null|undefined": "TodoAutoAdded_{0}"
        }
    }
}
```

You can also alias the `!` added for non-null assertions:

```shell
typestat --typeAlias undefined=TodoAutoAddedUndefined
```

```json
{
    "types": {
        "aliases": {
            "!": "! /* TODO */"
        }
    }
}
```

## `--typeMatching`/`matching`

Regular expression matchers added types must match.
If one or more of these are provided, any added type must match at least one of them.

For example, either will only allow `null` or `undefined` as added types:

```shell
typestat --typeMatching "^null$" --typeMatching "^undefined$"
```

```json
{
    "types": {
        "matching": [
            "^(null|undefined)$"
        ]
    }
}
```

## `--typeOnlyPrimitives`/`onlyPrimitives`

Whether to exclude type additions that contain complex object types, such as arrays and class instances.
This is particularly useful for `--typeStrictNullChecks`, where the only relevant types are `null` and `undefined`.

```shell
typestat --typeOnlyPrimitives
```

```json
{
    "types": {
        "onlyPrimitives": true
    }
}
```

## `--typeStrictNullChecks`/`strictNullChecks`

Whether to override the project's [`--strictNullChecks`](https://basarat.gitbooks.io/typescript/docs/options/strictNullChecks.html) setting.
If true, TypeStat will set `strictNullChecks` to `true` regardless of your `tsconfig.json`.

```shell
typestat --typeStrictNullChecks
```

```json
{
    "types": {
        "strictNullChecks": true
    }
}
```

This interacts with fixers in a few ways:

* Type additions will now include `null` and/or `undefined`
* [Property Accesses](./Nodes.md#Strict%20Property%20Accesses) will have `!`s added as needeed
