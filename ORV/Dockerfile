# filepath: d:\MARK\Oddaje Faks\2 Letnik\Pametni paketnik\pametni-paketnik\ORV\Dockerfile
# 1. Start with a basic Python lunchbox that already has Python 3.10
FROM python:3.10-bullseye AS builder

# Set the working directory in the container
WORKDIR /app

# Install git first, as it's needed for installing keras_vggface from GitHub
# And any other system build dependencies if they were needed
RUN apt-get update && \
    apt-get install -y --no-install-recommends git && \
    rm -rf /var/lib/apt/lists/*

# Copy only requirements.txt to leverage Docker cache
COPY requirements.txt .

# Create a virtual environment and install packages into it
# This helps in isolating packages and makes it easier to copy them
RUN python -m venv /opt/venv
# Activate the venv for subsequent RUN commands in this stage
ENV PATH="/opt/venv/bin:$PATH"

RUN echo "Attempting to install packages from requirements.txt..." && \
    pip install --no-cache-dir -r requirements.txt && \
    echo "All packages installed."

# STAGE 2: Final stage - Create the production image
FROM python:3.10-bullseye AS final
# Using slim for the final stage if possible, but bullseye is fine if slim causes issues with venv.

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy the virtual environment from the builder stage
COPY --from=builder /opt/venv /opt/venv

# Copy the application code
COPY . .

# Make sure the Python interpreter from the venv is used in the final image
ENV PATH="/opt/venv/bin:$PATH"

# Expose port
EXPOSE 3002

# Command to run the application
CMD ["python", "main.py"]