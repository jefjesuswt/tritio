import { Tritio, t } from 'tritio';
import users from './routes/user-routes';

const app = new Tritio({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    allowHeaders: ['Content-Type', 'Authorization'],
    preflight: {
      statusCode: 204
    }
  }
});



app.group('/api', (api) => {
    api.get('/hello', {
        response: t.String()
    }, () => 'Hello from API');

    api.group('/v1', (v1) => {
        v1.get('/user', {
            response: t.Object({ id: t.Number(), name: t.String() })
        }, () => ({ id: 1, name: 'Alice' }));
    });
});

// 2. Test .mount() with Constructor Prefix
const authApp = new Tritio({ prefix: '/auth' });
authApp.post('/login', {
    body: t.Object({ username: t.String() })
}, (c) => `Logged in as ${c.body.username}`);

// Mount authApp at /v2 (it has its own prefix /auth)
app.mount('/v2', authApp);

// 3. Test .mount() with explicit prefix
const adminApp = new Tritio();
adminApp.get('/dashboard', {}, () => 'Admin Dashboard');

app.mount('/admin', adminApp);
app.mount('/users', users);

// 4. Docs
app.docs();

app.listen(3000);
