# Use the official Python DevContainer base image
FROM mcr.microsoft.com/devcontainers/python:3.12

# Install system-level dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Optional: Node.js (for frontend builds)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

# Switch to vscode user to match container dev user
USER vscode

# Install Poetry for this user and make it available in PATH
RUN curl -sSL https://install.python-poetry.org | python3 - && \
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc

# Set working directory
# WORKDIR /workspace

# Install app dependencies if needed (done via postCreateCommand typically)