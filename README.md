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

```docker-compose up --build```

- No manual setup steps
- Database initialization must be automatic

---

## Mandatory Explanations
Include answers to the following in your README:

1. How did you handle concurrent updates?
2. How did you ensure transactional consistency?
3. Why did you choose your frontend state approach?
4. What would you improve for production?

---
Once you complete the project push on the same repo