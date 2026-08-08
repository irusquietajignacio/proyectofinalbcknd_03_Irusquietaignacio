# Adoption API: tests funcionales y Docker

API REST de adopciones creada desde cero para demostrar tests funcionales, aislamiento mediante fakes y ejecución reproducible en Docker.

## Requisitos

- Node.js 22 o superior
- npm 10 o superior
- Docker Desktop, para construir la imagen

## Estructura

```text
.
├── src/
│   ├── app.js
│   ├── server.js
│   ├── routes/adoption.router.js
│   └── repositories/adoption.repository.js
├── test/adoption.router.test.js
├── docs/entregable-google-docs.md
├── Dockerfile
├── .dockerignore
└── package.json
```

La aplicación usa un repositorio en memoria para que pueda ejecutarse sin una base de datos externa. `createApp` recibe un repositorio opcional, lo que permite inyectar fakes durante los tests.

## Endpoints

| Método | Ruta                       | Resultado            |
| ------ | -------------------------- | -------------------- |
| GET    | `/health`                  | Estado del servicio  |
| GET    | `/api/adoptions`           | Lista de adopciones  |
| GET    | `/api/adoptions/:aid`      | Una adopción o `404` |
| POST   | `/api/adoptions/:uid/:pid` | Crea una adopción    |
| DELETE | `/api/adoptions/:uid/:pid` | Elimina una adopción |

## Ejecutar localmente

```powershell
npm install
npm test
npm run test:coverage
npm start
```

Con el servidor iniciado, comprobar:

```powershell
curl http://localhost:3000/health
curl http://localhost:3000/api/adoptions
curl -X POST http://localhost:3000/api/adoptions/user-1/pet-1
curl -X DELETE http://localhost:3000/api/adoptions/user-1/pet-1
```

## Tests

```powershell
npm test
```

Los tests usan `node:test` y Supertest. El repositorio fake evita depender de MongoDB u otros servicios externos y permite probar respuestas exitosas, validaciones, recursos inexistentes, duplicados y errores internos.

## Docker

Construir la imagen:

```powershell
docker build -t adoption-api:1.0.0 .
```

Ejecutar el contenedor:

```powershell
docker run --rm --name adoption-api -p 3000:3000 adoption-api:1.0.0
```

Verificar el contenedor:

```powershell
curl http://localhost:3000/health
docker ps
docker inspect --format="{{json .State.Health}}" adoption-api
```

El Dockerfile usa `node:22-alpine`, instala únicamente dependencias de producción con `npm ci --omit=dev`, copia solo `src`, ejecuta como usuario no root y declara un healthcheck.

## DockerHub

Reemplazar `DOCKERHUB_USUARIO` por el usuario real:

```powershell
docker login
docker tag adoption-api:1.0.0 DOCKERHUB_USUARIO/adoption-api:1.0.0
docker push DOCKERHUB_USUARIO/adoption-api:1.0.0
docker scout quickview DOCKERHUB_USUARIO/adoption-api:1.0.0
```

URL a completar después de publicar: `https://hub.docker.com/r/DOCKERHUB_USUARIO/adoption-api`.

## Entrega

El documento listo para copiar a Google Docs está en [`docs/entregable-google-docs.md`](docs/entregable-google-docs.md). Incluye la estructura, explicación de tests, Dockerfile, comandos, campos para logs y URLs.

URLs a completar:

- Repositorio GitHub: `PENDIENTE`
- Imagen DockerHub: `PENDIENTE`
