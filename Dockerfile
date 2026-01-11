# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set the working directory in the container
WORKDIR /code

# Install system dependencies (needed for some python packages)
RUN apt-get update && apt-get install -y gcc libpq-dev

# Copy the requirements file into the container
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install psycopg2-binary "bcrypt==3.2.0" passlib

# Copy the rest of the application code
COPY . .

# Command to run the app using the FULL path
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
