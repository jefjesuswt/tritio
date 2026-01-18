import { Tritio, t } from 'tritio';
import { docs } from '@tritio/docs';

const app = new Tritio().use(docs());

app
  .post(
    '/users',
    {
      // 1. Documentación de Ruta (Scalar lo usa para agrupar y describir)
      detail: {
        tags: ['Users'], // 👈 ESTO CREA LA CARPETA EN SCALAR
        summary: 'Registrar usuario',
        description: 'Crea un nuevo usuario en el sistema y envía un correo de bienvenida.',
      },

      // 2. Documentación de Campos (TypeBox)
      body: t.Object({
        email: t.String({
          format: 'email',
          description: 'El correo electrónico único del usuario', // 👈 APARECE EN LA TABLA DE SCALAR
        }),
        age: t.Number({
          minimum: 18,
          description: 'La edad del usuario (debe ser mayor de edad)',
        }),
      }),

      response: t.Object(
        {
          id: t.String({ description: 'El UUID generado por la base de datos' }),
          status: t.String(),
        },
        { description: 'Usuario creado exitosamente' }
      ),
    },
    () => {
      return { id: '123', status: 'ok' };
    }
  )
  .get(
    '/users',
    {
      detail: {
        tags: ['Users'],
        summary: 'Obtener usuarios',
        description: 'Obtiene una lista de usuarios.',
      },
      response: t.Object({
        data: t.Array(t.String()),
      }),
    },
    () => {
      return { data: 'secure' };
    }
  );

app.listen(3000);
