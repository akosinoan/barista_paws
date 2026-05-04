-- Create admins table
CREATE TABLE admins (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    access_level INT NOT NULL DEFAULT 1
);
