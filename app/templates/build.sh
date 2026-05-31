#!/bin/bash
# Build resume PDF using Docker

docker build -t latex-resume .
mkdir -p output
docker run --rm -v "$(pwd)/output:/output" latex-resume
echo "Resume generated at output/resume.pdf"
