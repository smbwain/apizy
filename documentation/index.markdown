---
# Feel free to add content and custom Front Matter to this file.
# To modify the layout, see https://jekyllrb.com/docs/themes/#overriding-theme-defaults

layout: home
---

> Documentation is under construction!!

_apizy_ - a robust node.js library designed for seamless communication with a frontend app.

Designed with typescript in mind. 

---

Let’s break down the responsibilities:

- **You**:
    - Define your API methods and types on the backend.
- **apizy**:
    - Validates input/output structures during server compilation (when using TypeScript).
    - Checks input/output structures at runtime.
    - Exposes an HTTP API.
    - Provides a development page with detailed API documentation and a playground.
    - Generates a ready-to-use JavaScript SDK with highly typed TypeScript definitions, giving you all the API data structures on the frontend out of the box.

---

## Check it out

Here are 3 quick examples to show you how awesome it is:

### 1. Define Your First Method

```ts
import { createApi, string } from 'apizy';
const api = createApi();

api.createMethod(
    'helloWorld',               // <-- Name of the method
    string(),                   // <-- Input data
    string(),                   // <-- Output data
    async (input) => {          // <-- Handler
        return `Hello, ${input}!`;
    },
);
```

Once the SDK is loaded on your frontend, you can call the method like this:

```ts
await sdk.helloWorld('Johny'); // Returns "Hello, Johny!"
```

---

### 2. Define a Method for Creating a Blog Post

```ts
import { createApi, object, string, optional, arrayOf, uuid } from 'apizy';

const api = createApi();

api.createMethod(
    'articles.create',          // <-- Name of the method
    object({                    // <-- Input data      
        title: string(),
        content: string(),
        tags: optional(arrayOf(string())),
    }),
    object({                    // <-- Output data
        id: uuid(),
        url: string(),
    }),
    async (input) => {          // <-- Handler
        
        // TypeScript recognizes that input is a:
        //   { title: string; content: string; tags?: string[]; }
        // And that this function should return: { id: string; url: string; }

        // ...

        return { id, url };
    },
);
```

Now, call the method from your frontend client:

```ts
await sdk.articles.create({ title: 'My First Blog', content: '...' }); 
// Returns: { id: ..., url: ... }
// TypeScript also validates the input and output types here.
```

---

### 3. Define Entities and Query Relationships

In real-world projects, you may need to define data structures and relationships between them. For example, you might want to query blog articles along with their authors.

#### Define Entities

```ts
// Example interfaces you have in your project
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

// Add resolvers
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
        author: extend($User),   // <-- Extend helper for related data
    },
    article => ({
        id: article.id,
        content: article.content,
        tags: article.tags,
        author: async () => {
            // Lazy-loaded on demand
            const user = await MyDB.loadUser(article.authorId);
            return user; // $User resolver is used here
        },
    })
);
```

#### Expose Entities Through a Method

Entities cannot be directly loaded by the client. Instead, expose them via methods:

```ts
api.createMethod(
    'articles.list',             // <-- Name of the method
    object({                     // <-- Input data      
        limit: int(),
        // You can add more filters here in the future
    }),
    arrayOf($Article),           // <-- Output data
    async (input) => {           // <-- Handler
        
        const articles = MyDB.loadArticles({ limit: input.limit });

        return articles; // Resolved via $Article entity
    },
);
```

From the client:

```ts
sdk.articles.list({ limit: 100 });
// Returns: Array<{
//     id: string;
//     content: string;
//     tags: string[];
// }>
```

To include the related author in the query:

```ts
sdk.articles.list({ limit: 100 }, { extend: { author: {} } });
// Returns: Array<{
//     id: string;
//     content: string;
//     tags: string[];
//     author: {
//         id: string;
//         nickname: string;
//     }
// }>
```