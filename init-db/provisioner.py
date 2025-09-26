#!/usr/bin/env python3
"""
PostgreSQL Database Provisioner

This script provisions a PostgreSQL database by executing SQL migration files
in the correct order. It accepts a DATABASE_URL as a command-line parameter.

Usage:
    python provisioner.py --database-url "postgresql://user:pass@host:port/dbname"
    
Options:
    --dry-run: Show what would be executed without running
    --force: Skip confirmation prompts
    --verbose: Enable verbose logging
"""

import os
import sys
import argparse
import logging
import glob
from pathlib import Path
from typing import List, Optional
from urllib.parse import urlparse

try:
    import psycopg2
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
except ImportError:
    print("❌ psycopg2 not found. Please install it with: pip install psycopg2-binary")
    sys.exit(1)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class DatabaseConfig:
    """Database configuration parser"""
    
    def __init__(self, database_url: str):
        if not database_url:
            raise ValueError("DATABASE_URL is required")
        
        # Parse DATABASE_URL
        try:
            parsed = urlparse(database_url)
            self.host = parsed.hostname
            self.port = parsed.port or 5432
            self.database = parsed.path[1:] if parsed.path else None  # Remove leading '/'
            self.user = parsed.username
            self.password = parsed.password
            
            if not all([self.host, self.database, self.user, self.password]):
                raise ValueError("DATABASE_URL must include host, database, user, and password")
                
            logger.info(f"📊 Using DATABASE_URL: {self.database} on {self.host}:{self.port}")
            
        except Exception as e:
            raise ValueError(f"Failed to parse DATABASE_URL: {e}")
    
    def get_connection_params(self) -> dict:
        """Get psycopg2 connection parameters"""
        return {
            'host': self.host,
            'port': self.port,
            'database': self.database,
            'user': self.user,
            'password': self.password
        }
    
    def get_connection_string(self) -> str:
        """Get formatted connection string for display"""
        return f"postgresql://{self.user}:***@{self.host}:{self.port}/{self.database}"


class DatabaseProvisioner:
    """PostgreSQL database provisioner"""
    
    def __init__(self, config: DatabaseConfig, dry_run: bool = False):
        self.config = config
        self.dry_run = dry_run
        self.script_dir = Path(__file__).parent
    
    def get_sql_files(self) -> List[Path]:
        """Get all SQL files in the correct order"""
        sql_files = []
        
        # Look for numbered SQL files first (01-, 02-, etc.)
        numbered_files = sorted(glob.glob(str(self.script_dir / "[0-9][0-9]-*.sql")))
        sql_files.extend([Path(f) for f in numbered_files])
        
        # Then add any other SQL files
        all_sql_files = glob.glob(str(self.script_dir / "*.sql"))
        for sql_file in sorted(all_sql_files):
            sql_path = Path(sql_file)
            if not any(sql_path.name.startswith(f"{i:02d}-") for i in range(100)):
                sql_files.append(sql_path)
        
        return sql_files
    
    def test_connection(self) -> bool:
        """Test database connection"""
        try:
            logger.info(f"🔍 Testing connection to {self.config.get_connection_string()}")
            
            # First try to connect to the default database
            default_params = self.config.get_connection_params().copy()
            default_params['database'] = 'postgres'  # Default database
            
            with psycopg2.connect(**default_params) as conn:
                conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
                with conn.cursor() as cur:
                    cur.execute("SELECT version();")
                    version = cur.fetchone()[0]
                    logger.info(f"✅ Connected to PostgreSQL: {version}")
                    
                    # Check if target database exists, create if not
                    cur.execute(
                        "SELECT 1 FROM pg_database WHERE datname = %s", 
                        (self.config.database,)
                    )
                    
                    if not cur.fetchone():
                        logger.info(f"📦 Creating database '{self.config.database}'")
                        if not self.dry_run:
                            try:
                                cur.execute(f'CREATE DATABASE "{self.config.database}"')
                                logger.info(f"✅ Database '{self.config.database}' created")
                            except psycopg2.Error as e:
                                if "already exists" in str(e).lower():
                                    logger.warning(f"⚠️  Database '{self.config.database}' already exists")
                                else:
                                    raise
                        else:
                            logger.info(f"✅ [DRY RUN] Would create database '{self.config.database}'")
                    else:
                        logger.info(f"✅ Database '{self.config.database}' exists")
            
            return True
            
        except psycopg2.Error as e:
            logger.error(f"❌ Database connection failed: {e}")
            return False
        except Exception as e:
            logger.error(f"❌ Unexpected error during connection test: {e}")
            return False
    
    def execute_sql_file(self, sql_file: Path) -> bool:
        """Execute a single SQL file"""
        try:
            logger.info(f"📄 Processing: {sql_file.name}")
            
            with open(sql_file, 'r', encoding='utf-8') as f:
                sql_content = f.read()
            
            if self.dry_run:
                logger.info(f"🔍 [DRY RUN] Would execute {len(sql_content)} characters from {sql_file.name}")
                return True
            
            # Connect to the target database
            with psycopg2.connect(**self.config.get_connection_params()) as conn:
                conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
                
                with conn.cursor() as cur:
                    # Clean the SQL content first
                    cleaned_sql = self._clean_sql_content(sql_content)
                    
                    if not cleaned_sql.strip():
                        logger.info(f"⏭️  No SQL statements found in {sql_file.name}")
                        return True
                    
                    # Split into statements more intelligently
                    statements = self._split_sql_statements(cleaned_sql)
                    
                    for i, statement in enumerate(statements):
                        if statement.strip():
                            try:
                                cur.execute(statement)
                                logger.debug(f"✅ Executed statement {i+1}/{len(statements)}")
                                
                            except psycopg2.Error as e:
                                # Some errors might be expected (like "already exists")
                                if "already exists" in str(e).lower():
                                    logger.warning(f"⚠️  {e}")
                                else:
                                    logger.error(f"❌ Failed to execute statement {i+1}: {e}")
                                    logger.error(f"Statement: {statement[:200]}...")
                                    return False
            
            logger.info(f"✅ Successfully executed: {sql_file.name}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to process {sql_file.name}: {e}")
            return False
    
    def _clean_sql_content(self, content: str) -> str:
        """Clean SQL content by removing comments and psql commands"""
        lines = content.split('\n')
        cleaned_lines = []
        
        for line in lines:
            stripped = line.strip()
            
            # Skip empty lines
            if not stripped:
                continue
            
            # Skip comment lines
            if stripped.startswith('--'):
                continue
            
            # Skip psql meta-commands
            if stripped.startswith('\\'):
                logger.info(f"⏭️  Skipping psql command: {stripped}")
                continue
            
            cleaned_lines.append(line)
        
        return '\n'.join(cleaned_lines)
    
    def _split_sql_statements(self, sql_content: str) -> List[str]:
        """Split SQL content into individual statements, handling dollar-quoted strings"""
        statements = []
        current_statement = []
        in_dollar_quote = False
        dollar_tag = None
        
        lines = sql_content.split('\n')
        
        for line in lines:
            # Check for dollar-quoted string start/end
            if not in_dollar_quote:
                # Look for dollar quote start
                dollar_start = line.find('$$')
                if dollar_start != -1:
                    # Extract the tag (e.g., $func$, $$, etc.)
                    before_dollar = line[:dollar_start]
                    after_dollar = line[dollar_start+2:]
                    
                    # Find the tag
                    tag_end = after_dollar.find('$$')
                    if tag_end != -1:
                        dollar_tag = '$$' + after_dollar[:tag_end] + '$$'
                    else:
                        dollar_tag = '$$'
                    
                    in_dollar_quote = True
            else:
                # Look for dollar quote end
                if dollar_tag and dollar_tag in line:
                    in_dollar_quote = False
                    dollar_tag = None
            
            current_statement.append(line)
            
            # If not in dollar quote and line ends with semicolon, end statement
            if not in_dollar_quote and line.strip().endswith(';'):
                statement = '\n'.join(current_statement).strip()
                if statement:
                    statements.append(statement)
                current_statement = []
        
        # Add any remaining statement
        if current_statement:
            statement = '\n'.join(current_statement).strip()
            if statement:
                statements.append(statement)
        
        return statements
    
    def provision(self) -> bool:
        """Run the complete provisioning process"""
        logger.info("🚀 Starting database provisioning")
        
        # Test connection
        if not self.test_connection():
            return False
        
        # Get SQL files
        sql_files = self.get_sql_files()
        if not sql_files:
            logger.warning("⚠️  No SQL files found")
            return True
        
        logger.info(f"📋 Found {len(sql_files)} SQL files to execute:")
        for sql_file in sql_files:
            logger.info(f"  • {sql_file.name}")
        
        if self.dry_run:
            logger.info("🔍 [DRY RUN] Would execute the above files")
            return True
        
        # Execute files
        success_count = 0
        for sql_file in sql_files:
            if self.execute_sql_file(sql_file):
                success_count += 1
            else:
                logger.error(f"❌ Provisioning stopped at {sql_file.name}")
                return False
        
        logger.info(f"🎉 Provisioning completed successfully! Executed {success_count}/{len(sql_files)} files")
        return True


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="PostgreSQL Database Provisioner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Basic usage:
    python provisioner.py --database-url "postgresql://user:pass@host:port/dbname"
    
    # Neon database example:
    python provisioner.py --database-url "postgresql://neondb_owner:password@123-test.c-2.us-east-1.aws.neon.tech/documind?sslmode=require&channel_binding=require"
    
    # Dry run:
    python provisioner.py --database-url "postgresql://user:pass@host:port/dbname" --dry-run
        """
    )
    
    # Required database URL
    parser.add_argument(
        '--database-url',
        required=True,
        help='PostgreSQL connection string (e.g., postgresql://user:pass@host:port/dbname)'
    )
    
    # Execution options
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be executed without running'
    )
    parser.add_argument(
        '--force',
        action='store_true',
        help='Skip confirmation prompts'
    )
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Enable verbose logging'
    )
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Parse configuration
    try:
        config = DatabaseConfig(args.database_url)
    except Exception as e:
        logger.error(f"❌ Configuration error: {e}")
        sys.exit(1)
    
    # Show configuration
    logger.info(f"🔧 Database: {config.get_connection_string()}")
    
    if not args.force and not args.dry_run:
        try:
            response = input(f"\n⚠️  This will modify the database '{config.database}'. Continue? (y/N): ")
            if response.lower() not in ['y', 'yes']:
                logger.info("❌ Provisioning cancelled by user")
                sys.exit(0)
        except KeyboardInterrupt:
            logger.info("\n❌ Provisioning cancelled by user")
            sys.exit(0)
    
    # Run provisioner
    provisioner = DatabaseProvisioner(config, dry_run=args.dry_run)
    
    try:
        success = provisioner.provision()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        logger.info("\n❌ Provisioning interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()