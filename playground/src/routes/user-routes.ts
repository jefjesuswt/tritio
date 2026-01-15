import { Tritio, t } from "tritio";


const users = new Tritio();

users.get('/', {
    response: t.String()
}, () => 'users');

users.get('/:id', {
    response: t.String()
}, (c) => `user ${c.params.id}`);

users.post('', {
    body: t.Object({
        name: t.String(),
        email: t.String(),
        password: t.String()
    })
}, (c) => {
    return `User created: ${c.body.name}`;
})

export default users;