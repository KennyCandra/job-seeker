FROM ubuntu:22.04

RUN apt-get update -o Acquire::AllowInsecureRepositories=true && \
    apt-get install -y --allow-unauthenticated \
    texlive-latex-base \
    texlive-latex-extra \
    texlive-fonts-recommended \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY resume.tex /app/resume.tex

RUN pdflatex -interaction=nonstopmode resume.tex

CMD ["cp", "/app/resume.pdf", "/output/resume.pdf"]
