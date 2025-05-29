---
layout: page
title: Concept
permalink: /concept/
nav_order: 1
---

# Concept

In the core, there is a simple idea. You can define [methods](#methods) and [types](#type).

## Methods

**Method** is an endpoint any user request starts from.
It has input and output, described with [types](#types).

Method has a name. It can contain dots, which helps to organize methods into scopes. E.g. `artciles.create`, `users.update`, etc.

To define a method use `api.createMethod` function.

```ts
api.createMethod(
    // name of the method
    'currentUser.update',
    
    // input data shape
    object({ 
        firstName: optional(string()),
        lastName: optional(string()),
    }),
    
    // output data shape
    boolean(),
    
    // handler
    async (input) => { /*...*/ },
);
```

What does _apizy_ do here:

- Makes sure your handler input and output matches defined data shape
  - **On compilation state**, using agile typescript typings
  - **In runtime**, using checks
- Creates internal type structure. Based on that it can:
  - **generate documentation** reference page
  - **generate well typed typescript SDK**, ready to be used on a frontend

## Types

**Types** define a shape for input and output data of methods.

Sometimes it can be defined directly when defining methods (for simple cases).

```ts
api.createMethod(
    'currentUser.update',
    object({
        firstName: string(),
        lastName: string(),
    }),
    boolean(),
    async (input) => { /*...*/ },
);
```

You can store types in variable, to use it in different places

```ts
const $UserData = object({
    firstName: string(),
    lastName: string(),
});

api.createMethod(
    'currentUser.update',
    $UserData,
    boolean(),
    async (input) => { /*...*/ },
);

api.createMethod(
    'users.update',
    object({
        id: uuid(),
        data: $UserData,
    }),
    boolean(),
    async (input) => { /*...*/ },
);
```

## Aliases

If you want to give your type some name, visible in documentation and in SDK typings, you can use `api.createAlias`

```ts
const $UserData = api.createAlias('UserData', object({
    firstName: string(),
    lastName: string(),
}));

api.createMethod(
    'currentUser.update',
    $UserData,
    boolean(),
    async (input) => { /*...*/ },
);

api.createMethod(
    'users.update',
    object({
        id: uuid(),
        data: $UserData,
    }),
    boolean(),
    async (input) => { /*...*/ },
);
```

## Entities

In the real word usually you have data interfaces on your backend, responsible for entities.
(Like `User`, `Order`, `Product`, etc).

You can't just "throw" them into the API, because they can contain unserializable, secret, or just unnecessary data.

But it'd be cool, to have some kind of "wrappers" above these interfaces to serialize them to a client in simple and elegant way.

Here **entities** comes.

Let's define an entities for _User_ and _Article_.

```ts
// Interfaces you have in your project
interface User {
    id: string;
    nickname: string;
}

interface Article {
    id: string;
    authorId: string;
    content: string;
    tags: string[];
}

// Define API entities
const $User = api.createEntity<User>('User'); 
const $Article = api.createEntity<Article>('Article');

// Add resolvers for your entities
// They define, how your data is represented in an API, and how it should be serialized
$User.addResolver(
    {
        id: uuid(),
        nickname: string(),
    },
    user => ({
        id: user.id,
        nickname: user.nickname,
    })
);

$Article.addResolver(
    {
        id: uuid(),
        content: string(),
        tags: arrayOf(string()),
        author: extend($User),
          // extend() helper is used here, which means "author" property will not be included by default
          // only if client asked about it
    },
    article => ({
        id: article.id,
        content: article.content,
        tags: article.tags,
        author: async () => {
            // This method will be called only if needed
            const user = await MyDB.loadUser(article.authorId);
            
            // apizy knows that we should return $User here
            // so resolver of $User will be used automatically, to wrap this object
            return user;
        },
    })
);

// Define a method to retrive top 5 articles

api.createMethod(
    'articles.top',
    object({
        limit: int(),
    }),                // we don't expect input this time
    arrayOf($Article),   // array of articles should be returned
    async ({limit}) => {
        const articles = await MyDB.loadTopArticles({limit});
        
        // As apizy knows, that arrayOf($Article) should be returned
        // we just return array of articles.
        // Each article will be processes with $Article resolver
        return articles;
    }, 
);
```

When you generate a frontend SDK, it will have `sdk.articles.top` method.

```ts
await sdk.articles.top({limit: 5})
// Returns:
// {
//     id: '...',
//     content: '...',
//     tags: ['...', ...],
// }

await sdk.articles.top({limit: 5}, {extend: {author: {}}})
// Returns:
// {
//     id: '...',
//     content: '...',
//     tags: ['...', ...],
//     author: {
//        id: '...',
//        nickname: '...',
//     }
// }
```