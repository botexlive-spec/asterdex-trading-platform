USE finaster_mlm;

UPDATE users
SET password_hash = '$2b$10$.j7.Uwji.zDmgL11ryxTOOkVPb6GnMpY8aHzRMbZhXcsQWBxWaGFa'
WHERE email = 'admin@asterdex.com';

SELECT email, role, LEFT(password_hash, 25) as hash_check
FROM users
WHERE role = 'admin'
ORDER BY email;
