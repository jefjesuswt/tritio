import { t, Tritio} from "tritio";

const app = new Tritio();

app.get('/', {
    query: t.Object({
        name: t.String()
    })
}, (c) => {
    return {
        message: `Hello ${c.query.name || 'world'}, welcome to Tritio!`
    };
})

app.listen(3000)