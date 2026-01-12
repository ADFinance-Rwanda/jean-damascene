# Full-Stack Engineering Assessment

## Overview

This assessment evaluates real-world full-stack engineering skills using:

- Angular
- Node.js
- PostgreSQL
- Docker & Docker Compose

The goal is to build a **Task Assignment & Activity Tracking System** with strong focus on:

- Data consistency
- Concurrency handling
- Clean architecture
- Reasoned technical decisions

---

## Project Structure (Mandatory)

```
fullstack-assessment/
│
├── README.md
├── docker-compose.yml
├── .env.example
│
├── app/        # Angular frontend
│   ├── Dockerfile
│   └── src/
│
├── api/        # Node.js backend
│   ├── Dockerfile
│   ├── src/
│   └── package.json
│
└── db/         # Database setup
    ├── Dockerfile
    └── init.sql

```

Each folder must contain its own `Dockerfile`.

---

## Functional Requirements

### Users

- Create users
- List users

### Tasks

- Create tasks
- Assign tasks to users
- Update task status
- Delete tasks

### Task Status Rules

Allowed statuses:

- OPEN
- IN_PROGRESS
- DONE

❗ A task **cannot** move directly from `OPEN` → `DONE`.

This rule **must be enforced on the backend**.

---

## Activity Log (Mandatory)

Every time:

- A task status changes
- A task is assigned to a different user

Create an activity log entry containing:

- Task ID
- Action type
- Old value
- New value
- Timestamp

Task update and activity log creation must be **transactional**.

---

## Concurrency Requirement (Critical)

If two updates occur simultaneously on the same task:

- Only one update may succeed
- The other must return **HTTP 409 Conflict**

Explain your approach in the README.

---

## Frontend Requirements (Angular)

- Task list with assignment & status change
- Optimistic UI updates
- Rollback UI on API failure
- Activity timeline per task

---

## Backend Requirements (Node.js)

- RESTful API
- Proper HTTP status codes
- Centralized error handling
- Input validation

---

## Database (PostgreSQL)

- Proper schema design
- Foreign keys
- Indexes where appropriate

---

## Docker Requirements (Strict)

- The entire system must run using:

`docker-compose up --build`

- No manual setup steps
- Database initialization must be automatic

---

## Mandatory Explanations

Include answers to the following in your README:

1. How did you handle concurrent updates?
2. How did you ensure transactional consistency?
3. Why did you choose your frontend state approach?
4. What would you improve for production?

## How did you handle concurrent updates?

Concurrent updates were managed using versioning. Each task carries a version field that increments on every update.
When updating a task (status, assignment, or details), the frontend sends the current version to the backend. The backend checks the version:

If the version matches, the update succeeds.

If the version is stale (another user updated the task meanwhile), the backend rejects the update, preventing lost updates.

This ensures that multiple users cannot accidentally overwrite each other’s changes.

## How did you ensure transactional consistency?

Transactional consistency was ensured primarily on the backend:

Task updates (status change, assignment, edit) and their corresponding activity logs are saved in a single transaction.

This guarantees that either both the task and its activity log update succeed or both fail, preventing inconsistent data.

For example, if a status update fails midway, no partial record is saved in the activity_logs

## Why did you choose your frontend state approach?

I chose Angular Signals for frontend state management because:

Signals provide reactive state with minimal boilerplate. Components automatically update when state changes.

They are standalone-friendly and integrate cleanly with Angular’s injectable services.

For tasks and users, signals allow computed values (e.g., filteredTasks) without manually subscribing/unsubscribing.

This approach avoids over-engineering with NgRx for this small-to-medium scale application.

## What would you improve for production?

1. Implement WebSocket updates to keep all clients in sync in real-time.
2. Use a global state management solution like NgRx or Akita if the app scales further
3. Add unit and integration tests for components and services, especially for concurrency and versioning logic.
4. Add audit and security checks on the backend to ensure only authorized users can update or view tasks.

---

Once you complete the project push on the same repo
