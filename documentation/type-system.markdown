---
layout: page
title: Type system
permalink: /type-system/
nav_order: 3
---

# type-system
{: .no_toc }

apizy type-system is used to describe types of your API data structures. Input and output.

- TOC
{:toc}

# In short, how does it work

An _apizy type-system_ is based on special _helpers_: javaScript functions that define types.

It allows _apizy_ to extract appropriate types from your definitions on compilation stage, as well as do runtime checks of entire input and output when running server and also generate typescript definitions for SDK.

E.g.

```ts
import {createApi, object, float, arrayOf, optional, string, nullable, uuid, boolean} from 'apizy';
const api = createApi();

api.createEntity(
    'methodName',
    object({
        a: float(),
        b: optional(string()),
        c: nullable(arrayOf(object({
            id: uuid(),
        }))),
    }),
    boolean(),
    async (input) => {
        // input has type {
        //      a: number;
        //      b?: string;
        //      c: Array<{
        //          id: string;
        //      }> | null;
        // }
    }
);
```

# Helpers

## Primitive types

### string

```ts
string()
```

### int

```ts
int()
```

### float

```ts
float()
```

### boolean

```ts
boolean()
```

### uuid

```ts
uuid()
```

### oneOf

For fields that must match one of several values, use the `oneOf` helper.

```ts
const userRole = oneOf(['admin', 'editor', 'subscriber']);

const userShape = object({
    id: uuid(),
    role: userRole,
});
```

This ensures the `role` field only accepts one of the predefined values.

## Structures

### object

Defines an object that uses multiple types for its fields,

```ts
object({
    id: uuid(),
    email: string(),
    privateData: object({
        firstName: string(),
        lastName: string(),
    }),
});
```

### arrayOf

```ts
const tagsShape = arrayOf(string());

const blogPostShape = object({
    title: string(),
    tags: tagsShape,
});
```

This ensures `tags` is an array of strings.

## Modifiers

### nullable

When a field can be `null`, use the `nullable` helper.

```ts
const userShape = object({
    id: uuid(),
    phoneNumber: nullable(string()),
});
```

`phoneNumber` can either be a string or `null`.

### optional

To allow a field to be optional (can be omitted in the input), use the `optional` helper.

```ts
const userShape = object({
    id: uuid(),
    nickname: optional(string()),
});
```

Here `nickname` may or may not be included in the object.

### defaultValue

The same as [optional](#optional), but allows to set default value.

```ts
const userShape = object({
    role: defaultValue('user', string()),
});
```

Here if the `role` field is not provided, it defaults to `'user'`.

## Relations

### extend

This helper allows you to add parts of output, which should not be loaded by default.
But it can be loaded (extended) only if a client app requested that.

You can do that, because of performance reason, or size of the object.

**Example**

```ts
import {createApi, object, float, arrayOf, optional, string, nullable, uuid, boolean} from 'apizy';
const api = createApi();

api.createEntity(
    'users.getById',
    string(),
    object({
        id: uuid(),
        name: string(),
        topArticles: extend(arrayOf(object({  // <-- extend helpers here
            id: uuid(),
            text: string(),
        }))),
    }),
    async (input) => {
        return {
            id: '...',
            name: '...',
            topArticles: async () => {
                // this function will be called to load articles,
                // only when user request this extension
                return [ {
                    id: '...',
                    text: '...',
                } /* ,...*/ ];
            },
        };
    }
);
```

On client side:
```ts
sdk.users.getById('...')
// Returns: Promise<{
//     id: string;
//     name: string;
// }>
```

```ts
sdk.users.getById('...', {
    extend: {
        topArticles: {},
    },
});
// Returns: Promise<{
//     id: string;
//     name: string;
//     topArticles: {
//         id: string;
//         text: string;
//     },
// }>
```

Extends can be nested.

### relation

TODO

> Check out [Entities](./api#entities) first.