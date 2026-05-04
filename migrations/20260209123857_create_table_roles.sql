-- Add migration script here
CREATE TABLE roles(
    id Serial PRIMARY Key,
    name VARCHAR(64) NOT NULL UNIQUE
);

insert into roles (name) values ('client');
insert into roles (name) values ('admin');

--migrate:down
--DROP TABLE roles; 