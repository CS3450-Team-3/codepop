# CodePop

A P2P-enabled soda pop ordering platform.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) with the Compose plugin (or Docker Desktop)
- Python 3 (for the setup wizard only)

## First-Time Setup

Run the setup wizard once to configure your store and generate `docker-compose.yml`. The wizard will prompt for admin credentials and store info, then launch the server automatically.

```bash
python setup_server.py
```

The wizard offers a **test config** option (press Enter to accept) that fills in default values — useful for local development.

Once the wizard completes, the server starts via `docker compose up --build`. When it's ready:

| Service  | URL                     |
| -------- | ----------------------- |
| Frontend | http://localhost:4000   |
| Backend  | http://localhost:9000   |

## Subsequent Starts

```bash
docker compose up
```

## Stopping the Server

```bash
# Stop containers
docker compose down

# Stop and wipe ALL data (full reset)
docker compose down -v
```

## API Documentation

The backend exposes interactive API docs. The backend must be running to access these.

- **Swagger UI:** http://localhost:9000/api/schema/swagger-ui/
- **Redoc:** http://localhost:9000/api/schema/redoc/
- **OpenAPI JSON:** http://localhost:9000/api/schema/

## Running Backend Tests

### Standard Tests

Run from the project root (requires a running database or Docker environment):

```bash
docker compose exec backend python manage.py test
```

### P2P & Integration Tests

#### Level 1: Logic Verification (Fast)

Validates P2P logic and JWT claims using mocks:

```bash
docker compose exec backend python manage.py test backend.tests_p2p
```

#### Level 2: Full Integration (Multi-Instance)

Orchestrates two real servers and validates discovery and network-level proxying. Run from the **project root**:

```bash
python codepop_backend/integration_tests/full_p2p_automated_test.py
```

For more detail, see the [Integration Tests README](codepop_backend/integration_tests/README.md).

## Default Test Data

When using the test config, the following accounts and data are created:

### Users

| Username | Password    | Email           | Role  |
| -------- | ----------- | --------------- | ----- |
| admin    | password123 | test@email.com  | Admin |

### Featured Drinks

- **Coke Float**: Vanilla + Coke + Cream
- **Seasonal Depression**: Cinnamon, Chocolate, Pumpkin Spice, Cucumber + Rootbeer
- **I've Heard It Both Ways**: Pineapple, Bubble Gum, Cotton Candy + Dr. Pepper
- **Red Rizz**: Peach, Cranberry + Big Red
