---
layout: page
title: Get started
permalink: /get-started/
nav_order: 2
---

## Get Started (with express)

Getting started is easy! Just follow these few steps:

1. Install packages

   ```bash
   npm i express apizy apizy-express
   ```

2. Create and expose an API in your backend application.

    ```ts
    import { createApi } from 'apizy';
    import apizyExpress from 'apizy-express';
    import express from 'express';

    const api = createApi();
   
    // API methods and types definitions here ...
    api.createMethod(
        'helloWorld',               // <-- Name of the method
        string(),                   // <-- Input data
        string(),                   // <-- Output data
        async (input) => {          // <-- Handler
            return `Hello, ${input}!`;
        },
    );

    const app = express();
    app.use('/api', apizyExpress(api, {
        devTools: {
            enabled: true, // Enables dev tools like interactive documentation
                           // Documentation available at /api/dev
                           // SDK available at /api/dev/sdk.ts
        },
    }));

    app.listen(8080);
    ```

3. Add a script to your frontend application `package.json`:

    ```json
    "scripts": {
        "update-sdk": "curl http://localhost:8080/api/dev/sdk.ts -o src/sdk.auto.ts"
    }
    ```

   Run it to download up-to-date SDK definitions. Usually you'd like to do it from your local or test server.

4. Initialize the SDK in your frontend application:

    ```ts
    import { createSDK } from './sdk.auto.ts';
    
    const sdk = createSDK('http://localhost:8080/api');
    ```

5. Call your methods on sdk:

    ```ts
    sdk.helloWorld('John'); // -> Promise<'Hello, John!'>
    ```

Your SDK is ready to go! Start declaring and calling your first methods—it’s as simple as that!
