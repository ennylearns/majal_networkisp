# Hashed Voucher Storage

Vouchers represent monetized internet access credentials. To protect against unauthorized credential theft during internal data access or database backups, vouchers are stored in PostgreSQL exclusively as SHA-256 hashes (`code_hash`), with plain-text codes delivered strictly once to customers at purchase time.

## Considered Options

- **Plaintext Storage**: Allows re-printing and viewing historical codes in Admin dashboard, but creates high security risk of employee misuse or mass credential compromise on DB leak.
- **Reversible Encryption (AES)**: Allows decryption by backend, but requires central key management and decrypt access in memory.
- **Irreversible SHA-256 Hashing (Chosen)**: Validates entered voucher codes by hashing guest input and matching `code_hash` without storing raw secrets.

## Consequences

- Lost voucher codes cannot be retrieved by admins; replacement requires re-issuing a new voucher.
- Database dumps contain zero usable voucher plaintext credentials.
