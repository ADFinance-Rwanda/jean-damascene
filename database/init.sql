CREATE TYPE task_status AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE');


CREATE TABLE users (
id SERIAL PRIMARY KEY,
name VARCHAR(100) NOT NULL,
email VARCHAR(150) UNIQUE NOT NULL,
created_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE tasks (
id SERIAL PRIMARY KEY,
title VARCHAR(200) NOT NULL,
description TEXT,
status task_status DEFAULT 'OPEN',
assigned_user_id INT REFERENCES users(id),
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


CREATE INDEX idx_activity_task ON activity_logs(task_id);