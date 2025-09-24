# Thailand National Software Contest Final Round Qualifier (27P23W0013)
## Web Application for Document Management and Sharing Using Artificial Intelligence

A modern, full‑stack web application that lets teams **create, share, and process documents** across departments and organizations. Built with **Next.js (React + TypeScript)** on the frontend and **Convex** as the serverless backend, it offers real‑time collaboration, role‑based access control, and powerful document‑processing utilities. And if you were curioused this readme is mostly written by AI but I've verified that it was good enough.

## Table of Contents

1. [Features](#features)  
2. [Architecture Overview](#architecture-overview)  
3. [Getting Started](#getting-started)  
   - [Prerequisites](#prerequisites)  
   - [Installation](#installation)  
   - [Running Locally](#running-locally)  
   - [Docker Setup](#docker-setup)  
4. [Project Structure](#project-structure)  
5. [Key Components](#key-components)  
6. [Backend (Convex) Overview](#backend-convex-overview)  
7. [Testing & Linting](#testing--linting)  
8. [Deployment](#deployment)  
9. [Contributing](#contributing)  
10. [License](#license)  

---

## Features

- **Document CRUD** – Create, read, update, delete documents with versioning.  
- **Sharing & Permissions** – Share documents across departments or organizations with fine‑grained role management.  
- **Advanced Search** – Full‑text search with filters (department, owner, tags).  
- **Real‑time Notifications** – Users receive live updates when documents are edited or shared.  
- **Document Processing** – Server‑side utilities for extracting metadata, generating summaries, and more (see `lib/document_processing.ts`).  
- **Responsive UI** – Built with a custom component library (`components/ui/*`) and Tailwind‑styled layouts.  
- **Docker‑ready** – Deployable via a single Dockerfile and `docker-compose.yml`.  

## Architecture Overview

```
+-------------------+          +-------------------+
|   Frontend (Next) |  HTTP    |   Convex Backend  |
|   - React (TSX)   | <------> |   - Serverless    |
|   - UI Library    |          |   - Functions     |
+-------------------+          |   - Convex DB     |
                               |   - Convex Auth   |
                               +-------------------+
                                          |
                                          |  File / Blob Storage
                                          v
                               +-------------------+
                               |   Storage (S3 or  |
                               |   Convex Storage) |
                               +-------------------+
```

- **Next.js** handles routing (`app/*`), server‑side rendering, and static assets.  
- **Convex** provides the data layer (`convex/*.ts`) with generated TypeScript bindings (`convex/_generated/server.js`).  
- **Docker** containers encapsulate both services for easy local development and production deployment.  

## Getting Started

### Prerequisites

- **Node.js** ≥ 18 (recommended LTS)  
- **npm** or **yarn** (npm is used in the scripts)  
- **Docker** (optional, for containerized dev)  
- **Convex CLI** (`npm i -g convex`) – needed for local backend emulation  

### Installation

```bash
# Clone the repo
git clone https://github.com/Th4phat/nsc-2025-project
cd nsc-2025-project

# Install dependencies
npm install
```

### Running Locally

1. **Start Convex backend (dev mode)**  
   ```bash
   npx convex dev
   ```
   This launches the local Convex server and watches `convex/*.ts`.

2. **Start Next.js dev server**  
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

> The frontend automatically connects to the local Convex instance via the URL defined in `convex/convex.json`.

### Docker Setup

```bash
# Build the image
docker build -t nsc-docs .

# Run with docker‑compose (includes Convex dev server)
docker-compose up
```

The app will be reachable at `http://localhost:3000`.

## Project Structure

```
/app                     – Next.js pages & layouts
  /layout.tsx           – Root layout (globals, providers)
  /page.tsx             – Landing page
  /(application)/
    /dashboard/         – Main dashboard UI
    /manage-folders/    – Folder CRUD UI
    /manage-user/       – User & role management UI
    /profile/           – User profile page
    /send-across-dep/   – Cross‑department sharing UI
    /send-across-org/   – Cross‑organization sharing UI
    /sys-control/       – System admin controls
    /view-syslog/       – System log viewer

/components
  /ui/*                 – Reusable UI primitives (button, dialog, etc.)
  /ShareModal.tsx        – Modal for sharing documents
  /UploadModal.tsx       – Document upload UI
  /NotificationSidebar.tsx – Real‑time notifications
  /nav-main.tsx         – Main navigation bar
  /app-sidebar.tsx      – Sidebar navigation

/convex
  *.ts                  – Serverless functions (CRUD, sharing, auth, etc.)
  convex.json           – Convex project config

/lib
  document_processing.ts – Helpers for extracting metadata, summarizing, etc.

/public
  avatars/*             – Placeholder avatars
  convex.svg            – Branding

/dockerfile, docker-compose.yml – Container file
/package.json           – Scripts, dependencies, version
/tsconfig.json          – TypeScript configuration
/next.config.ts         – Next.js custom config
```

## Key Components

| Component | Purpose | Notable Files |
|-----------|---------|----------------|
| **Dashboard** | Central hub showing recent docs, activity, and quick actions | `app/(application)/dashboard/page.tsx` |
| **ShareModal** | UI for selecting users/departments to share a document with | `components/ShareModal.tsx` |
| **AdvanceSearch** | Full‑text search with filters | `components/AdvanceSearch.tsx` |
| **Document Processing** | Extracts text, generates summaries, validates formats | `lib/document_processing.ts` |
| **Auth & Role Management** | Handles login, JWT, role‑based access | `convex/auth.ts`, `convex/role_management.ts` |
| **Notification System** | Pushes real‑time updates via Convex subscriptions | `hooks/use-notifications.ts` |
| **Dockerfile** | Builds a production‑ready image with both Next.js and Convex | `dockerfile` |

## Backend (Convex) Overview

The backend lives under `convex/` and follows a **serverless function** model:

- **Document CRUD** – `convex/document_crud.ts`  
- **Sharing Logic** – `convex/document_sharing.ts` & `convex/document_distribution.ts`  
- **Folder Management** – `convex/folders.ts`  
- **User & Role Management** – `convex/user_management.ts`, `convex/role_management.ts`  
- **Audit Logs** – `convex/audit_logs.ts` (captures every mutation for compliance)  

All functions are typed with generated TypeScript bindings (`convex/_generated/server.js`) ensuring end‑to‑end type safety between client and server.

## Testing & Linting

```bash
# Run TypeScript type‑check
npm run typecheck

# Lint with ESLint (configured in eslint.config.mjs)
npm run lint

# (Optional) Add Jest tests under __tests__/ and run:
npm test
```

The project uses **Prettier** (`.prettierrc`) for consistent formatting.

## Deployment

1. **Build the Next.js app**  
   ```bash
   npm run build
   ```

2. **Push Convex functions**  
   ```bash
   npx convex deploy
   ```

3. **Deploy Docker image** (e.g., to Fly.io, Render, or your own Kubernetes cluster)  
   ```bash
   docker push your-registry/nsc-docs:latest
   ```

Environment variables (e.g., `CONVEX_DEPLOYMENT_URL`) are defined in `docker-compose.yml` and can be overridden in production.

## Contributing

1. Fork the repository.  
2. Create a feature branch (`git checkout -b feat/awesome-feature`).  
3. Ensure linting and type‑checking pass.  
4. Open a Pull Request with a clear description and screenshots if UI changes are involved.

Please follow the **Code of Conduct** (see `CODE_OF_CONDUCT.md`) and respect the **license** below.

## License

This project is licensed under the **MIT License** – see the `LICENSE` file for details.

---

*Happy coding! 🎉* kub