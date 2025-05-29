---
layout: page
title: API Reference
permalink: /api/
nav_order: 3
---

> TODO

# API
{: .no_toc }

- TOC
{:toc}

## createApi

Api instance is needed to declare methods and types, and then expose it to a client.
Create API with _createApi_ function.

```ts
import {createApi} from 'apizy';

const api = createApi<Context = {}>();
```

Context can be useful if you want to share some things between handlers which will process every request.

E.g.

- authorization (@TODO: add example)
- access to raw http server (express) request object (@TODO: add example)
- db connection attached to client
- implementing cache on request level

## expose api

## Context

## Methods

```ts
createMethod<Output>(
    name: string,
    input: null,
    output: OutputType<Output>,
    handler: (input: void, context: Context) => Promise<Output>,
): void;

createMethod<Input, Output>(
  name: string,
  input: InputType<Input>,
  output: OutputType<Output>,
  handler: (input: Input, context: Context) => Promise<Output>,
): void;
```

## Entities

## Alias

## Custom types
