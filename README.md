# apizy

**A robust library designed for seamless communication between a Node.js backend and a JavaScript frontend, crafted with TypeScript in mind to ensure no data detail is missed between the two.**

Check out the [DOCUMENTATION](https://smbwain.github.io/apizy/)

---

**Define your API endpoints as simple, as:**

```ts
import { object, string, optional, arrayOf, uuid } from 'apizy';

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
        
        // ...

        return { id, url };
    },
);
```

**Use it on frontend as simple as:**

```ts
sdk.articles.create({title: '...', content: '...'})
```
