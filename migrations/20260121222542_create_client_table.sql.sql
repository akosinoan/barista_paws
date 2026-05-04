-- Add migration script here
--migrate:up

CREATE TABLE clients(
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    vip_card_number TEXT NULL
);

--migrate:down
--DROP TABLE clients;