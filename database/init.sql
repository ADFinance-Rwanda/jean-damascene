CREATE TYPE task_status AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE');
CREATE TYPE user_role AS ENUM ('ADMIN', 'USER');


CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role user_role DEFAULT 'USER',
  created_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE tasks (
id SERIAL PRIMARY KEY,
title VARCHAR(200) NOT NULL,
description TEXT,
comment TEXT[],
status task_status DEFAULT 'OPEN',
assigned_user_id INT REFERENCES users(id),
created_by INT NOT NULL REFERENCES users(id),
version INT DEFAULT 1,
created_at TIMESTAMP DEFAULT NOW(),
updated_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE activity_logs (
id SERIAL PRIMARY KEY,
task_id INT REFERENCES tasks(id) ON DELETE CASCADE,
action_type VARCHAR(50) NOT NULL,
old_value TEXT,
new_value TEXT,
created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id INT REFERENCES tasks(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,          -- e.g., 'TASK_ASSIGNED', 'TASK_UPDATED'
    message TEXT NOT NULL,              -- notification content
    is_read BOOLEAN DEFAULT FALSE,      -- unread by default
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes to improve query performance
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_task ON notifications(task_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

CREATE INDEX idx_activity_task ON activity_logs(task_id);