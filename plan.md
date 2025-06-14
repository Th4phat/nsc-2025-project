# Project Plan & Expected Functionality: AI Document Management & Sharing Platform

## I. Project Plan

**Phase 1: Planning & Setup**

*   [ ] **Finalize Core Scope:** Confirm MVP features vs. stretch goals.
*   [ ] **Technology Stack Confirmation:** Lock in choices (Frontend: Vite/React/Tailwind, Main Backend: Node/Express/Drizzle, AI Backend: Python/FastAPI, DB: Postgres, Orchestration: Docker).
*   [ ] **Basic Architecture Design:** Sketch data models (Users, Docs, Shares, Roles, Permissions), API endpoints (high-level).
*   [ ] **Environment Setup:** Set up Git repository, Docker Compose configuration, basic project structures for Frontend, Main Backend, AI Backend.
*   [ ] **Task Breakdown & Assignment:** Divide initial tasks among team members (if applicable).

**Phase 2: Core Backend & Database Setup**

*   [ ] **Database Schema Implementation:** Define tables in PostgreSQL using Drizzle ORM migrations.
*   [x] **User Authentication:** Implement basic user registration and login endpoints in the Main Backend API (using JWT or similar).
*   [ ] **Basic Document Metadata API:** Create endpoints for uploading metadata (POST), listing documents (GET), getting single document details (GET).
*   [ ] **File Storage Integration:** Set up connection to file storage (S3/MinIO) and implement basic file upload logic (receiving file, storing, saving key to DB).
*   [ ] **Dockerize Services:** Ensure Main Backend and DB run correctly via Docker Compose.

**Phase 3: Frontend Basics & Core Document Flow**

*   [x] **Basic UI Layout:** Implement the main 3-pane layout using Tailwind CSS.
*   [ ] **Login/Registration Pages:** Create frontend forms and connect to backend auth endpoints.
*   [ ] **Document List Display:** Fetch and display a list of documents (metadata) from the backend API.
*   [ ] **Document Upload UI:** Create the upload form/modal, connect to backend API for metadata and file upload.
*   [ ] **Basic Document Detail View:** Display metadata for a selected document.
*   [ ] **Dockerize Frontend:** Ensure frontend service runs via Docker Compose.

**Phase 4: AI Backend & Integration**

*   [ ] **AI Backend Setup:** Create basic FastAPI service.
*   [ ] **Model Loading:** Implement logic to load the chosen Transformer model(s).
*   [ ] **AI Analysis Endpoint:** Create an API endpoint (e.g., `/analyze`) that accepts document content/path and returns categories and suggested recipients.
*   [ ] **Main Backend Integration:** Modify the document upload flow in the Main Backend to call the AI Backend API after file upload, and save the AI results (categories, suggestions) to the database.
*   [ ] **Dockerize AI Backend:** Add AI service to Docker Compose.

**Phase 5: Sharing & RBAC Implementation**

*   [ ] **Sharing API Endpoints:** Create Main Backend endpoints to initiate a share (linking doc, recipient, permissions) and list shared documents.
*   [ ] **RBAC Logic (Basic):** Implement basic role checks (e.g., is user logged in? maybe a simple 'admin' vs 'user' check) in Main Backend API middleware or endpoints. Define basic roles/permissions in DB.
*   [x] **Sharing UI:** Implement the "Share" modal/button on the frontend. Allow selecting users (mock search initially) and trigger the sharing API.
*   [ ] **"Shared with Me" View:** Implement the frontend view to list documents shared with the current user.
*   [ ] **Access Control Enforcement:** Ensure API endpoints for viewing/downloading documents check ownership OR share permissions before granting access.

**Phase 6: Testing, Refinement & Polish**

*   [ ] **End-to-End Testing:** Test the full flow: Login -> Upload -> AI Process -> View -> Share -> View Shared Doc.
*   [ ] **Bug Fixing:** Address critical bugs found during testing.
*   [ ] **UI Polish:** Improve styling, layout consistency, and basic responsiveness.
*   [ ] **Error Handling:** Add basic error handling and user feedback (e.g., upload success/failure messages).

**Phase 7: Deployment & Documentation**

*   [ ] **Prepare Demo Script:** Outline the key features to showcase.
*   [ ] **Deployment (Simple):** Deploy using Docker Compose on a simple server/cloud instance OR prepare for local demo.
*   [ ] **Final Report/Presentation:** Complete required documentation, focusing on architecture, features, and AI components.
*   [ ] **Code Cleanup (Basic):** Ensure code is reasonably organized and commented.

## II. Expected Functionality

### Core Functionality (Minimum Viable Product - MVP)

*   **User Authentication:**
    *   User can register for a new account.
    *   User can log in with existing credentials.
    *   User can log out.
*   **Document Upload:**
    *   User can select and upload document files (e.g., PDF, DOCX).
    *   Basic metadata (like filename) is captured.
    *   File is securely stored.
*   **AI Processing (Core):**
    *   **Automatic Categorization:** Uploaded documents are processed by the AI backend, and at least one relevant category tag is assigned and stored.
    *   **Recipient Suggestion:** The AI backend suggests at least one potential internal recipient based on document content/context.
*   **Document Management & Viewing:**
    *   User can see a list of documents they have access to (owned or shared).
    *   User can see basic metadata (name, owner, AI category) in the list.
    *   User can select a document to view its details (metadata, AI category, who shared it).
    *   User can download the original uploaded file.
*   **Basic Search:**
    *   User can perform keyword-based search across document metadata (name, category).
*   **Sharing (Core):**
    *   User can initiate sharing for a document they own/have permission for.
    *   User can specify at least one recipient user.
    *   The system records the share action.
    *   Users can view documents explicitly shared with them (e.g., in a "Shared with Me" list).
*   **Basic Access Control (RBAC):**
    *   Only logged-in users can access the system.
    *   Users can only view/download documents they own OR documents explicitly shared with them. (More granular permissions are stretch goals).

### Stretch Goals (If Time Permits)

*   **AI Natural Language Search:** Allow users to search using full sentences or questions.
*   **Automated AI Sharing:** Option for the system to automatically share based on AI suggestions without user confirmation.
*   **Document Previews:** Display previews of common file types (PDF, images) directly in the UI.
*   **Advanced RBAC:** Implement UI for managing roles/permissions, more granular permissions (edit metadata, re-share).
*   **Realtime Notifications:** Notify users instantly when a document is shared with them.
*   **User-Defined Folders:** Allow users to create their own folders for organization.
*   **Trash & Recovery:** Implement a soft-delete mechanism.
*   **AI Summarization:** Display an AI-generated summary in the document detail view.
*   **Version History:** Track document versions.
*   **Enhanced UI/UX:** More polished UI, better responsiveness, loading states.

This plan provides a roadmap, but flexibility is key in a hackathon. Prioritize the MVP features that best demonstrate the core value proposition, especially the AI integration and secure sharing.


------
can you plan to add an auto send feature that will auto send the document to rest of the users by using ai to evaluate based on context like what's that document? exameple like it's a document for hiring a new employee so it should be sending to someone that's in hr department, if there a person name in the document it should be sending to that person