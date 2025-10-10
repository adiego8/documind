# Database Provisioner

This directory contains the PostgreSQL database provisioner for the Persona application. The provisioner automatically executes SQL migration files in the correct order to set up the database schema.

## Files

- `provisioner.py` - Main provisioner script
- `01-init.sql` - Initial database schema
- `02-multiple-assistants.sql` - Multiple assistants support
- `03-cleanup-sessions.sql` - Session cleanup
- `04-admin-codes-conversations.sql` - Admin codes and conversation tracking
- `05-admin-owned-assistants.sql` - Admin-owned assistants
- `06-add-user-codes.sql` - User codes functionality

## Usage

### Prerequisites

Make sure you have the required dependencies installed:

```bash
pip install psycopg2-binary python-dotenv
```

### Configuration

Set up your database connection using environment variables. You can use either:

**Option 1: DATABASE_URL (recommended)**
```bash
export DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
```

**Option 2: Individual variables**
```bash
export DB_HOST="your-host"
export DB_PORT="5432"
export DB_NAME="your-database"
export DB_USER="your-user"
export DB_PASSWORD="your-password"
```

### Running the Provisioner

```bash
# Basic usage
python provisioner.py

# Dry run (see what would be executed)
python provisioner.py --dry-run

# Skip confirmation prompts
python provisioner.py --force

# Verbose output
python provisioner.py --verbose
```

### Example with Neon Database

For a Neon PostgreSQL database:

```bash
export DATABASE_URL="postgresql://neondb_owner:password@123-test.c-2.us-east-1.aws.neon.tech/Persona?sslmode=require&channel_binding=require"
python provisioner.py
```

Or using individual variables:

```bash
export DB_HOST="123-test.c-2.us-east-1.aws.neon.tech"
export DB_PORT="5432"
export DB_NAME="Persona"
export DB_USER="neondb_owner"
export DB_PASSWORD="password"
python provisioner.py
```

## Features

- ✅ Supports both `DATABASE_URL` and individual DB variables
- ✅ Automatically creates the target database if it doesn't exist
- ✅ Executes SQL files in numerical order (01-, 02-, etc.)
- ✅ Handles PostgreSQL-specific commands gracefully
- ✅ Provides detailed logging and error handling
- ✅ Supports dry-run mode for testing
- ✅ Graceful handling of "already exists" errors
- ✅ Cross-platform compatibility

## Error Handling

The provisioner handles common scenarios:

- **Database doesn't exist**: Automatically creates it
- **Tables already exist**: Continues with warnings
- **Connection failures**: Provides clear error messages
- **SQL syntax errors**: Stops execution and reports the problematic statement

## Development

To add new migration files:

1. Create a new SQL file with the format `XX-description.sql` (e.g., `07-new-feature.sql`)
2. The provisioner will automatically detect and execute it in order
3. Test with `--dry-run` first to verify the changes

## Troubleshooting

**Connection refused**: Check your database host, port, and credentials
**Permission denied**: Ensure your user has CREATE DATABASE privileges
**SSL required**: Add `?sslmode=require` to your DATABASE_URL for cloud providers

For more help, run: `python provisioner.py --help`
