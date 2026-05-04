-- Add migration script here
INSERT INTO users (
    id,
    email,
    hashed_password,
    first_name,
    last_name,
    phone_number,
    address
)

values(
    gen_random_uuid(),
    'noan.babao@gmail.com',
    '$2b$12$3zsxWHQJA.ApfzcDcwidfeq1oENQa9Id6qkFgYz4Mm38bAdMRM/DS',
    'noan',
    'babao',
    '123-123-1234',
    'b32 l1 p1'
);

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
from users u, roles r
where u.email = 'noan.babao@gmail.com' and r.name = 'admin';