export interface RequestOptions<ExtendQuery> {
    extend?: ExtendQuery;
    signal?: AbortSignal;
    noRefreshJwt?: boolean;
}

const createRequestFunction = ({tokenAuth, jwtAuth, apiUrl}: {
    apiUrl: string;
    jwtAuth?: {
        refreshToken: () => Promise<void>;
        setJWT: (jwt: string | null) => void;
        getJWT: () => string | null;
    };
    tokenAuth?: {
        apiKey: string;
    };
}) => {
    let refreshTokenPromise: Promise<any> | null = null;
    const refreshToken = () => {
        return (refreshTokenPromise ??= (async () => {
            await new Promise((res) => setTimeout(res, 0));
            await jwtAuth!.refreshToken();
            refreshTokenPromise = null;
        })());
    };

    const request = async (
        path: string,
        input: any,
        options: RequestOptions<any>,
    ): Promise<any> => {
        const jwt = jwtAuth?.getJWT();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (jwt) {
            headers.Authorization = `Bearer ${jwt}`;
        }
        if (tokenAuth) {
            headers['X-API-KEY'] = tokenAuth.apiKey;
        }
        const req = await fetch(`${apiUrl}/${path}`, {
            method: 'post',
            body: JSON.stringify({
                input,
                extend: options?.extend,
            }),
            headers,
            signal: options?.signal,
            credentials: 'include',
        });
        if (!req.ok) {
            if (req.status === 401 && jwtAuth && jwt && !options?.noRefreshJwt) {
                let error;
                try {
                    await refreshToken();
                } catch (err) {
                    error = err ?? new Error();
                    jwtAuth.setJWT(null);
                    console.error(err);
                }

                if (!error) {
                    return await request(path, input, {
                        ...options,
                        noRefreshJwt: true,
                    });
                }
            }
            const {title, message} = await req.json();
            const err = new Error('ServerError');
            err.message = `${title}: ${message}`;
            throw err;
        }
        const res = await req.json();
        if (jwtAuth && typeof res?.output?.$jwt !== 'undefined') {
            jwtAuth.setJWT(res?.output?.$jwt);
        }
        return res.output;
    };

    return request;
};