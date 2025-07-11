# Project: AI-Powered Document Management and Distribution System

## 1. Project Overview

This project is a comprehensive, AI-powered document management and distribution system designed to streamline document workflows within an organization. It provides robust features for user and role management, departmental organization, secure document storage, advanced sharing capabilities with granular permissions, and intelligent automation through AI for document categorization and recipient suggestions. The system ensures document integrity, controlled access, and transparent audit trails, making it an essential tool for modern enterprise environments.

## 2. Technical Stack

*   **Frontend**: Next.js (React), Shadcn UI, Radix UI, Tailwind CSS
*   **Backend**: Convex (BaaS) for real-time database, serverless functions (queries, mutations, actions), and file storage.
*   **Authentication**: Convex Auth (`@convex-dev/auth`)
*   **AI Integration**: Google GenAI (Gemini) for document categorization and intelligent suggestions.
*   **NLP (Potential)**: Hugging Face Transformers (`@xenova/transformers`) is included, suggesting capabilities for advanced NLP tasks.
*   **Document Processing**: Libraries for handling PDF (`pdf-ts`), DOCX (`mammoth`), XLSX (`xlsx`) file formats.
*   **Internationalization**: Indicated by the use of `date-fns/locale/th` and Thai text in the UI, supporting multilingual environments.

## 3. Data Model (Convex Schema)

The `convex/schema.ts` defines the core data structures:

*   **`roles`**: Defines system roles with associated permissions.
    *   Fields: `name` (string), `isAdmin` (boolean), `permissions` (array of strings, e.g., `auditLog:read`, `role:manage`).
*   **`users`**: User accounts.
    *   Fields: `clerkUserId` (string, for Clerk/Convex Auth integration), `name` (string), `email` (string), `profileImage` (string, optional).
*   **`profiles`**: User profiles with linkage to roles and departments.
    *   Fields: `userId` (ID of `users`), `roleId` (ID of `roles`), `departmentIds` (array of IDs of `departments`).
*   **`departments`**: Organizational departments.
    *   Fields: `name` (string), `parentDepartmentId` (optional ID of `departments` for hierarchy), `isArchived` (boolean).
*   **`documents`**: Main document storage.
    *   Fields: `title` (string), `description` (optional string), `fileId` (ID of `_storage`), `uploadBy` (ID of `users`), `aiCategories` (array of strings, for AI-generated categories), `aiSuggestedRecipients` (array of objects with `userId` and `score`), `documentStatus` (string, e.g., 'pending', 'processed'), `isClassified` (boolean), `aiProcessStatus` (string, e.g., 'pending', 'complete'), `aiProcessError` (optional string).
*   **`documentFolders`**: Links documents to folders.
    *   Fields: `documentId` (ID of `documents`), `folderId` (ID of `folders`).
*   **`folders`**: Document folders for organization.
    *   Fields: `name` (string), `departmentId` (ID of `departments`), `parentId` (optional ID of `folders` for nesting).
*   **`documentShares`**: Tracks document sharing between users.
    *   Fields: `documentId` (ID of `documents`), `userId` (ID of `users`), `canRead` (boolean), `canEdit` (boolean), `canShare` (boolean), `isRead` (boolean).
*   **`userDocumentStatus`**: Tracks read/unread status of documents for users.
    *   Fields: `userId` (ID of `users`), `documentId` (ID of `documents`), `isRead` (boolean).
*   **`auditLogs`**: Records system activities for auditing.
    *   Fields: `userId` (ID of `users`), `action` (string), `details` (any type, JSON), `timestamp` (number).
*   **`distributedDocuments`**: Tracks documents distributed to departments.
    *   Fields: `documentId` (ID of `documents`), `departmentId` (ID of `departments`), `distributedBy` (ID of `users`), `distributedAt` (number).

## 4. Key Features and Implementation

### 4.1. User and Role Management

*   **User Creation**:
    *   Users can be created individually (`createUser` mutation) or in batches via CSV upload (`batchCreateUsers` mutation).
    *   `internalCreateUser` handles the actual database insertion and links to Convex Auth.
*   **User Management UI (`/manage-user`)**: Provides an administrative interface for listing, updating, and deleting users.
*   **Role-Based Access Control (RBAC)**:
    *   Predefined roles: Employee, Head of Department (HOD), Director, System Administrator.
    *   `convex/roles.ts` defines these roles and their base permissions.
    *   `convex/auth.ts` implements `queryWithAuth` and `mutationWithAuth` to enforce permissions using the `hasPermission` helper.
    *   `convex/role_management.ts` provides CRUD operations for roles and allows assigning specific permissions to each role through a `RoleManager` component.
*   **Permission Checks**: Permissions are checked before executing sensitive operations (e.g., `auditLog:read`, `role:manage`, `document:manage`). `getMyPermissions` query retrieves the current user's permissions.

### 4.2. Department Management

*   **Creation & Management**:
    *   Departments can be created, updated, deleted, or archived (`createDepartment`, `updateDepartment`, `deleteDepartment`, `archiveDepartment` mutations).
    *   `DepartmentManager` component provides the UI for department administration.
*   **Hierarchy**: Departments can be nested using a `parentDepartmentId` field.
*   **Department-specific Access**: Documents can be distributed to specific departments.

### 4.3. Document Management and Storage

*   **Document Upload**:
    *   Users can upload documents through the `UploadModal` component.
    *   `generateUploadUrl` provides a signed URL for secure file uploads to Convex Storage.
    *   Supported file types: PDF, DOCX, XLSX, JPEG, PNG, etc.
    *   `isClassified` tag is an option during upload.
*   **Document Storage**: Files are stored in Convex's `_storage` system table.
*   **Document Lifecycle**:
    *   `createDocument` mutation initiates the document creation process, including scheduling AI processing.
    *   `getDocumentDetails`, `listOwnedDocuments`, `getAllDocuments` (admin-only) for document retrieval.
    *   `deleteDocument` removes the document record, shares, and the associated file from storage.
*   **Folders**: Documents can be organized into folders.
    *   `createFolder`, `getFolders`, `moveDocument` mutations handle folder operations.
    *   Folders are department-specific and can be nested.
*   **Content Viewing**: `DocumentModal` displays document content, supporting various file types through direct rendering or external viewers (e.g., PDF viewer).
*   **Download**: `generateDownloadUrl` provides secure, authenticated download links.

### 4.4. Document Sharing and Distribution

*   **Granular Sharing**:
    *   `shareDocument` mutation allows sharing with specific users, defining `canRead`, `canEdit`, and `canShare` permissions.
    *   `ShareModal` component provides a user-friendly interface for sharing, including AI-powered recipient suggestions.
*   **Unsharing**: `unshareDocument` mutation revokes access.
*   **Read Status Tracking**: `markDocumentAsRead` mutation updates the `isRead` status in `userDocumentStatus`.
*   **Notifications**: `NotificationSidebar` displays unread document notifications, indicating newly shared documents.
*   **Departmental Distribution (`/send-across-dep`)**:
    *   HODs can distribute documents to departments they control (`sendToDepartments` mutation).
    *   Extensive permission checks ensure HODs only distribute within their authorized scope.
*   **Organizational Distribution (`/send-across-org`)**:
    *   Directors can distribute documents to the entire organization or specific departments (`sendToOrganization` mutation).
    *   This targets all eligible users within the selected scope.

### 4.5. AI Integration (Google GenAI - Gemini)

*   **Document Content Extraction (`getBlobContent`)**:
    *   The `processDocument` action uses `getBlobContent` to extract text from various document types (PDF, DOCX, XLSX) and image data (JPEG, PNG).
    *   This prepares the content for AI processing.
*   **AI Categorization**:
    *   `processDocument` sends document content to Google GenAI for automatic categorization.
    *   `updateDocumentCategoriesAndStatus` mutation updates the `documents` table with `aiCategories`.
    *   `getUniqueAiCategories` query provides a dynamic list of AI-generated categories for filtering documents.
*   **AI Recipient Suggestions (`generateAiShareSuggestions`)**:
    *   Utilizes Google GenAI to suggest relevant recipients for document sharing based on document content and implied user expertise/roles.
    *   `updateAiSuggestions` mutation stores these suggestions.

### 4.6. Audit Logging

*   **Comprehensive Logging**: `auditLogs` table records user actions and system events.
*   **View Audit Logs (`/view-syslog`)**:
    *   Permission-gated query `getAuditLogs` allows authorized users (e.g., System Administrators) to view system activity.
    *   Provides transparency and accountability for critical operations.

## 5. Workflow

The system supports a typical document lifecycle:

1.  **Upload Document**: A user uploads a document. During upload, AI processing is triggered.
2.  **AI Processing**: The document content is extracted and sent to Google GenAI for categorization and (optionally) recipient suggestions. The document status is updated accordingly.
3.  **Document Management**: Users can manage their owned documents, move them to folders, and search/filter by various criteria, including AI categories.
4.  **Sharing**:
    *   Users can share documents with other specific users, setting precise read/edit/share permissions. AI suggestions can assist in selecting recipients.
    *   HODs and Directors can leverage mass distribution features to departments or the entire organization.
5.  **Access and Review**: Recipients access shared documents, mark them as read, and are notified of new documents.
6.  **Auditing**: All significant actions are logged for compliance and monitoring purposes, accessible to administrators.

## 6. Project Structure

The project follows a standard Next.js and Convex application structure:

*   **`app/`**: Next.js App Router for frontend pages and layouts.
    *   `app/(application)/`: Protected routes requiring authentication.
    *   `app/api/`: API routes (potentially for external integrations, though Convex serves most backend needs).
*   **`components/`**: Reusable React components for the UI (e.g., `UploadModal`, `ShareModal`, `RoleManager`).
*   **`convex/`**: Convex backend functions and schema.
    *   `convex/schema.ts`: Database schema definition.
    *   `convex/_generated/`: Automatic Convex code generation (API types, data model).
    *   Individual `config.ts`, `http.ts` files for specific Convex setups.
    *   Other `.ts` files: Contain queries, mutations, and actions organized by feature domain (e.g., `users.ts`, `documents.ts`, `ai.ts`).
*   **`hooks/`**: Custom React hooks for frontend logic.
*   **`lib/`**: Utility functions and helper modules.
*   **`public/`**: Static assets.

This comprehensive overview