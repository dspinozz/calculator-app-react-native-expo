# tests/test_database.py
import pytest
import sys
import os
import sqlite3
import tempfile
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import init_db, authenticate_user, check_duplicate_user
import hashlib

class TestDatabase:
    def setup_method(self):
        # Use in-memory database for testing
        self.test_db = tempfile.NamedTemporaryFile(delete=False)
        self.test_db.close()
        import database
        original_db = database.DATABASE
        database.DATABASE = self.test_db.name
        init_db()
        self.original_db = original_db
    
    def teardown_method(self):
        import database
        database.DATABASE = self.original_db
        import os
        os.unlink(self.test_db.name)
    
    def test_username_uniqueness(self):
        from database import get_db
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)", 
                         ('testuser', 'hash1'))
            conn.commit()
            
            # Try to insert duplicate
            with pytest.raises(sqlite3.IntegrityError):
                cursor.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)", 
                             ('testuser', 'hash2'))
    
    def test_email_uniqueness(self):
        from database import get_db
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)", 
                         ('user1', 'hash1', 'test@example.com'))
            conn.commit()
            
            # Try to insert duplicate email
            with pytest.raises(sqlite3.IntegrityError):
                cursor.execute("INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)", 
                             ('user2', 'hash2', 'test@example.com'))
