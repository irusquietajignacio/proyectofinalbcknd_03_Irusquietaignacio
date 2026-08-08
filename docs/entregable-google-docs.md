# Entregable: Tests funcionales y Dockerización

> Este documento está preparado para copiarse a Google Docs. Completar las URLs de GitHub y DockerHub después de publicar los repositorios.

## 1. Estructura del proyecto

```text
.
├── src/
│   ├── app.js
│   ├── server.js
│   ├── routes/adoption.router.js
│   └── repositories/adoption.repository.js
├── test/adoption.router.test.js
├── Dockerfile
├── .dockerignore
├── package.json
└── README.md
```

`src/routes/adoption.router.js` define los endpoints. `src/repositories` contiene la dependencia de persistencia en memoria. `src/app.js` ensambla Express y permite inyectar un fake. `test` contiene las pruebas funcionales HTTP. `Dockerfile` empaqueta la aplicación.

## 2. Tests funcionales

El archivo completo es `test/adoption.router.test.js`. Las pruebas usan Supertest para hacer solicitudes HTTP reales contra Express y un fake repository para aislar base de datos y servicios externos.

Se cubren:

- `GET /api/adoptions`: respuesta exitosa y error interno.
- `GET /api/adoptions/:aid`: adopción encontrada y `404`.
- `POST /api/adoptions/:uid/:pid`: creación exitosa, usuario/mascota inexistente (`404`) y duplicado (`409`).
- `DELETE /api/adoptions/:uid/:pid`: eliminación exitosa, inexistente (`404`) y error interno.

### Código completo

```javascript
import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";

function createFakeRepository(overrides = {}) {
  const calls = { list: 0, findById: [], create: [], removeByPair: [] };
  const repository = {
    calls,
    async list() {
      calls.list += 1;
      return [{ id: "adoption-1", userId: "user-1", petId: "pet-1" }];
    },
    async findById(id) {
      calls.findById.push(id);
      return id === "adoption-1"
        ? { id, userId: "user-1", petId: "pet-1" }
        : null;
    },
    async create(input) {
      calls.create.push(input);
      return { id: "adoption-2", ...input };
    },
    async removeByPair(userId, petId) {
      calls.removeByPair.push({ userId, petId });
      return userId === "user-1" && petId === "pet-1";
    },
    ...overrides,
  };
  return repository;
}

test("GET list success and repository error", async () => {
  const repository = createFakeRepository();
  const response = await request(createApp({ repository })).get(
    "/api/adoptions",
  );
  assert.equal(response.status, 200);
  assert.equal(response.body.payload.length, 1);

  const failing = createFakeRepository({
    list: async () => {
      throw new Error("database unavailable");
    },
  });
  const errorResponse = await request(createApp({ repository: failing })).get(
    "/api/adoptions",
  );
  assert.equal(errorResponse.status, 500);
});

test("GET by id success and not found", async () => {
  const repository = createFakeRepository();
  const found = await request(createApp({ repository })).get(
    "/api/adoptions/adoption-1",
  );
  assert.equal(found.status, 200);
  const missing = await request(createApp({ repository })).get(
    "/api/adoptions/missing",
  );
  assert.equal(missing.status, 404);
});

test("POST success, missing resource, and duplicate", async () => {
  const repository = createFakeRepository();
  const created = await request(createApp({ repository })).post(
    "/api/adoptions/user-1/pet-2",
  );
  assert.equal(created.status, 201);

  const notFoundError = Object.assign(new Error("Pet not found"), {
    code: "PET_NOT_FOUND",
  });
  const notFound = createFakeRepository({
    create: async () => {
      throw notFoundError;
    },
  });
  assert.equal(
    (
      await request(createApp({ repository: notFound })).post(
        "/api/adoptions/user-1/missing",
      )
    ).status,
    404,
  );

  const duplicateError = Object.assign(new Error("Adoption already exists"), {
    code: "DUPLICATE_ADOPTION",
  });
  const duplicate = createFakeRepository({
    create: async () => {
      throw duplicateError;
    },
  });
  assert.equal(
    (
      await request(createApp({ repository: duplicate })).post(
        "/api/adoptions/user-1/pet-1",
      )
    ).status,
    409,
  );
});

test("DELETE success, not found, and repository error", async () => {
  const repository = createFakeRepository();
  assert.equal(
    (
      await request(createApp({ repository })).delete(
        "/api/adoptions/user-1/pet-1",
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await request(createApp({ repository })).delete(
        "/api/adoptions/user-9/pet-9",
      )
    ).status,
    404,
  );

  const failing = createFakeRepository({
    removeByPair: async () => {
      throw new Error("database unavailable");
    },
  });
  assert.equal(
    (
      await request(createApp({ repository: failing })).delete(
        "/api/adoptions/user-1/pet-1",
      )
    ).status,
    500,
  );
});
```

### Evidencia de ejecución

```text
> adoption-api-functional-tests@1.0.0 test
> node --test --test-reporter=spec

✔ 10 pruebas funcionales
ℹ tests 10
ℹ pass 10
ℹ fail 0
```

Cobertura obtenida con `npm run test:coverage`: 83.07% global, 88.73% en `adoption.router.js`, 100% de líneas del archivo de tests.

## 3. Dockerización

```dockerfile
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY src ./src
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/health').then(response => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "src/server.js"]
```

Se utiliza Alpine para reducir el tamaño, `npm ci` para instalaciones reproducibles, una capa separada para dependencias, usuario sin privilegios `node`, y un `HEALTHCHECK` para verificar el servicio.

La imagen se construyó correctamente en Docker Desktop con:

```powershell
docker build -t adoption-api:1.0.0 .
```

Resultado resumido del build:

```text
[+] Building 16.7s (11/11) FINISHED
=> naming to docker.io/library/adoption-api:1.0.0
```

## 4. Imagen Docker

Nombre local: `adoption-api:1.0.0`.

Nombre público previsto: `DOCKERHUB_USUARIO/adoption-api:1.0.0`.

URL pública: `https://hub.docker.com/r/DOCKERHUB_USUARIO/adoption-api`.

La ejecución del contenedor produjo:

```text
7f4ca3572168 adoption-api:1.0.0 ... Up ... 0.0.0.0:3000->3000/tcp
GET /health -> {"status":"ok"}
GET /api/adoptions -> {"status":"success","payload":[]}
```

El healthcheck aparecía inicialmente como `starting`, con `FailingStreak: 0`; Docker necesita unos segundos para marcarlo como `healthy` debido al `start-period` configurado. El escaneo básico se ejecuta con `docker scout quickview adoption-api:1.0.0`.

Resultado del escaneo básico realizado:

```text
Target adoption-api:1.0.0
Base image node:22-alpine
Policy status FAILED (4/7 policies met)
Vulnerabilidades reportadas: 1 crítica y 7 altas
Usuario no root: OK
Sin vulnerabilidades de alto perfil: OK
```

Este resultado debe informarse en la entrega: Docker Scout detectó vulnerabilidades heredadas de la imagen base o sus paquetes. Para investigarlas se puede ejecutar `docker scout cves adoption-api:1.0.0`; no se deben ocultar los resultados del escaneo.

## 5. Ejecución del proyecto

```powershell
npm install
npm test
npm run test:coverage

docker build -t adoption-api:1.0.0 .
docker run --rm --name adoption-api -p 3000:3000 adoption-api:1.0.0
curl http://localhost:3000/health
```

Para publicar:

```powershell
docker login
docker tag adoption-api:1.0.0 DOCKERHUB_USUARIO/adoption-api:1.0.0
docker push DOCKERHUB_USUARIO/adoption-api:1.0.0
docker scout quickview DOCKERHUB_USUARIO/adoption-api:1.0.0
```

## 6. README

El README completo se encuentra en la raíz del proyecto y debe copiarse aquí.
