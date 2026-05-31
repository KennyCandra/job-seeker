You are generating resume content as structured JSON and LaTeX-friendly text.

Personal data (name, email, phone, location, links) is provided in the input — use it exactly as given, do not modify.

# Generation Rules

- Never leave [FILL] placeholders in output
- Tailor summary and bullets to the job title and company
- Use full URLs with scheme for links

## Experience

### Full-Stack Engineer (Adobe Extensions) | Vogel Edits | 01/2025 - Present

- Built and shipped production Adobe After Effects & Premiere Pro extensions, including Vanish BG — a real-time AI background removal tool available at aescripts.com, running ML inference inside a sandboxed CEP environment.
- Solved Adobe's restricted CEP runtime limitations by designing a Node.js sidecar process architecture that handles AI inference outside the sandbox, using local HTTP for IPC and streaming results back to the React UI in real time.
- Built and submitted a TTS Premiere Pro extension using Node.js with local ONNX model inference, designing the full audio pipeline from text input to rendered timeline clip.
- Collaborated asynchronously with designers and stakeholders, shipping production-ready tools using agile workflows.

### Full-Stack Engineer | Freelance | 11/2024 - 01/2025

- Built a full-stack tourism booking platform using Next.js, TypeScript, and Node.js with TypeORM for type-safe PostgreSQL access.
- Applied PostgreSQL indexing strategies and EXPLAIN ANALYZE to achieve sub-100ms API response times under concurrent load.
- Integrated Paymob payment gateway with idempotent transaction handling and webhook verification, reducing checkout friction by 40%.
- Improved SEO and Core Web Vitals to 95+ Lighthouse score using Next.js SSR, image optimization, and lazy loading.

## Project Highlights

### RootCluster — AI-Powered Log Analysis Platform | rootcluster.dev

- **Tech:** Node.js, TypeScript, PostgreSQL (pgvector), Redis, BullMQ, ONNX, AWS ECS Fargate, Docker, GitHub Actions
- **Skills Used:** TypeScript, Node.js, PostgreSQL, Redis, AWS, Docker, BullMQ
- Designed and deployed distributed log ingestion pipeline on AWS ECS Fargate processing 1M+ events/hour with sub-second latency.
- Reduced ONNX embedding time from 20+ minutes to under 1 minute via batch processing, Redis caching, and worker autoscaling.
- Designed event-driven pipeline: normalize → embed → cluster → merge → root cause, with retries, exponential backoff, DLQs, and idempotent processing.
- Implemented centroid-based pgvector clustering to unify cross-service failures into single root causes.
- Set up full CI/CD with GitHub Actions OIDC, ECR, SSM Parameter Store, RDS PostgreSQL, and ElastiCache.
- Applied PostgreSQL internals (MVCC, isolation levels, indexing) to build high-throughput write pipeline avoiding lock contention.
- Leveraged CAP theorem tradeoffs: PostgreSQL for strong consistency, Redis for high-availability caching.

### Medical CRM — AI-Enhanced Prescription Platform

- **Tech:** React, Node.js, PostgreSQL
- **Skills Used:** React, Node.js, PostgreSQL, JWT, RBAC
- Built full-stack CRM handling diagnoses, prescriptions, and patient records.
- Implemented JWT auth with access/refresh token rotation and RBAC across three permission levels.
- Designed drug interaction validation across 500+ medications using graph-based PostgreSQL lookup.
- Optimized dashboard queries for 10K+ monthly records using composite indexes and window functions.

## Skills

### Languages

TypeScript, Rust, Python

### Frontend

React, Next.js, Tailwind CSS,

### Backend

Node.js, Express.js, REST APIs, Event-Driven Architecture, Async Processing

### Databases

PostgreSQL, MongoDB, Redis

### Async & Messaging

BullMQ, Dead-Letter Queues, Idempotent Processing

### Infrastructure

Docker, GitHub Actions CI/CD, Vercel, DigitalOcean

### Core Competencies

Distributed Systems, System Design, CAP Theorem, MVCC, Database Internals, Networking (HTTP/2, HTTP/3, TCP/UDP, WebSockets)

## Education

- **Degree:** Faculty of Pharmacy
- **School:** Modern University, Cairo, Egypt
- **Year:** 2024
- **Note:** Self-taught software engineer since 2022, learning by building production systems in evenings and weekends.
