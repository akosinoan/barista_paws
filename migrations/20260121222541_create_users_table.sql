-- Add migration script here
--migrate:up



CREATE TABLE users(

    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    hashed_password TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone_number TEXT NULL,
    address TEXT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

--migrate:down
--DROP TABLE users;