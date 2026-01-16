import { Tritio, t } from 'tritio';

const app = new Tritio();

app.get('/', {
    response: t.Object({ message: t.String() })
}, () => {
    return { message: "Hello from Tritio!" };
});

app.listen(3000, () => {
    console.log('🚀 Server running at http://localhost:3000');
});