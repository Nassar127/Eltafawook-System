# Start the DB
db-up:
	docker compose up -d db

# Stop the DB
db-down:
	docker compose down

# Reset DB (dev only, deletes all data)
db-reset:
	docker compose down -v
	docker compose up -d db

# Run backend (will set up later)
run-backend:
	poetry run uvicorn backend.app.main:app --reload

# Run tests
test:
	poetry run pytest -vv
