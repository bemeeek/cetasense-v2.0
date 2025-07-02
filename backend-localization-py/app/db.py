# Improved db.py dengan Connection Pooling dan Better Error Handling

import os
import pymysql
import pymysql.cursors
from datetime import datetime
from contextlib import contextmanager
from typing import Optional, Dict, Any
import logging
import time
from threading import Lock
from queue import Queue, Empty, Full
import atexit

logger = logging.getLogger(__name__)

# Database configuration from environment
DB_CONFIG = {
    'host': os.getenv("DB_HOST"),
    'port': int(os.getenv("DB_PORT", 3307)),
    'user': os.getenv("DB_USER"),
    'password': os.getenv("DB_PASSWORD",""),
    'database': os.getenv("DB_NAME"),
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor,
    'autocommit': False
}

# Connection pool configuration
POOL_SIZE = int(os.getenv("DB_POOL_SIZE", 10))
MAX_OVERFLOW = int(os.getenv("DB_MAX_OVERFLOW", 5))
POOL_TIMEOUT = float(os.getenv("DB_POOL_TIMEOUT", 30.0))
POOL_RECYCLE = int(os.getenv("DB_POOL_RECYCLE", 3600))  # Recycle connections after 1 hour

class ConnectionPool:
    """Simple connection pool for PyMySQL"""
    
    def __init__(self, 
                 config: Dict[str, Any],
                 pool_size: int = 10,
                 max_overflow: int = 5,
                 timeout: float = 30.0,
                 recycle: int = 3600):
        self.config = config
        self.pool_size = pool_size
        self.max_overflow = max_overflow
        self.timeout = timeout
        self.recycle = recycle
        
        self._pool = Queue(maxsize=pool_size)
        self._overflow = 0
        self._lock = Lock()
        self._created_connections = 0
        self._created_at = time.time()
        # Pre-create minimum connections
        for _ in range(min(3, pool_size)):
            try:
                conn = self._create_connection()
                self._pool.put(conn)
            except Exception as e:
                logger.warning(f"Failed to pre-create connection: {e}")
        
        # Register cleanup on exit
        atexit.register(self.dispose)
    
    def _create_connection(self) -> pymysql.connections.Connection:
        """Create a new database connection"""
        conn = pymysql.connect(**self.config)
        conn._created_at = time.time()  # type: ignore  # Track connection age
        self._created_connections += 1
        logger.debug(f"Created new connection (total: {self._created_connections})")
        return conn
    
    def _is_connection_valid(self, conn: pymysql.connections.Connection) -> bool:
        """Check if connection is still valid"""
        try:
            # Check if connection is too old
            if hasattr(conn, '_created_at'):
                age = time.time() - conn._created_at  # type: ignore
                if age > self.recycle:
                    logger.debug(f"Connection too old ({age:.0f}s), will recycle")
                    return False
            
            # Ping to check if connection is alive
            conn.ping(reconnect=False)
            return True
        except:
            return False
    
    def get_connection(self) -> pymysql.connections.Connection:
        """Get a connection from the pool"""
        start_time = time.time()
        
        while True:
            # Try to get from pool
            try:
                conn = self._pool.get(block=False)
                if self._is_connection_valid(conn):
                    return conn
                else:
                    # Close invalid connection
                    try:
                        conn.close()
                    except:
                        pass
                    self._created_connections -= 1
                    continue
            except Empty:
                pass
            
            # Check if we can create overflow connection
            with self._lock:
                if self._created_connections < self.pool_size + self.max_overflow:
                    try:
                        return self._create_connection()
                    except Exception as e:
                        logger.error(f"Failed to create connection: {e}")
                        raise
            
            # Wait for available connection
            elapsed = time.time() - start_time
            if elapsed >= self.timeout:
                raise TimeoutError(f"Failed to get connection from pool after {self.timeout}s")
            
            try:
                conn = self._pool.get(timeout=min(1.0, self.timeout - elapsed))
                if self._is_connection_valid(conn):
                    return conn
                else:
                    try:
                        conn.close()
                    except:
                        pass
                    self._created_connections -= 1
            except Empty:
                continue
    
    def return_connection(self, conn: pymysql.connections.Connection):
        """Return a connection to the pool"""
        if not self._is_connection_valid(conn):
            try:
                conn.close()
            except:
                pass
            self._created_connections -= 1
            return
        
        try:
            # Rollback any uncommitted transaction
            if not conn.get_autocommit():
                conn.rollback()
            
            # Try to return to pool
            self._pool.put(conn, block=False)
        except Full:
            # Pool is full, close the connection
            try:
                conn.close()
            except:
                pass
            self._created_connections -= 1
    
    def dispose(self):
        """Dispose all connections in the pool"""
        logger.info("Disposing connection pool...")
        
        # Close all pooled connections
        while not self._pool.empty():
            try:
                conn = self._pool.get_nowait()
                conn.close()
            except:
                pass
        
        self._created_connections = 0

# Global connection pool instance
_connection_pool: Optional[ConnectionPool] = None
_pool_lock = Lock()

def get_pool() -> ConnectionPool:
    """Get or create the global connection pool"""
    global _connection_pool
    
    if _connection_pool is None:
        with _pool_lock:
            if _connection_pool is None:
                _connection_pool = ConnectionPool(
                    config=DB_CONFIG,
                    pool_size=POOL_SIZE,
                    max_overflow=MAX_OVERFLOW,
                    timeout=POOL_TIMEOUT,
                    recycle=POOL_RECYCLE
                )
    
    return _connection_pool

# Backward compatible function
def get_connection() -> pymysql.connections.Connection:
    """Get a database connection (backward compatible)"""
    pool = get_pool()
    return pool.get_connection()

@contextmanager
def get_db_connection():
    """Context manager for database connections"""
    pool = get_pool()
    conn = None
    
    try:
        conn = pool.get_connection()
        yield conn
    except Exception:
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            pool.return_connection(conn)

@contextmanager
def transaction():
    """Context manager for database transactions"""
    with get_db_connection() as conn:
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise

# Helper functions for common operations
def execute_query(query: str, params: Optional[Dict] = None, fetch_one: bool = False):
    """Execute a query and return results"""
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(query, params)
            if fetch_one:
                return cursor.fetchone()
            return cursor.fetchall()

def execute_update(query: str, params: Optional[Dict] = None) -> int:
    """Execute an update/insert/delete query"""
    with transaction() as conn:
        with conn.cursor() as cursor:
            cursor.execute(query, params)
            return cursor.rowcount

# Retry decorator for database operations
def with_db_retry(max_retries: int = 3, delay: float = 1.0):
    """Decorator to retry database operations on failure"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except (pymysql.err.OperationalError, pymysql.err.InterfaceError) as e:
                    last_exception = e
                    if attempt < max_retries - 1:
                        logger.warning(f"Database operation failed (attempt {attempt + 1}/{max_retries}): {e}")
                        time.sleep(delay * (attempt + 1))  # Exponential backoff
                    else:
                        logger.error(f"Database operation failed after {max_retries} attempts: {e}")
                except Exception as e:
                    # Don't retry on other exceptions
                    raise
            
            raise last_exception if last_exception else Exception("Unknown error occurred")
        
        return wrapper
    return decorator

# Example usage in your existing code:
if __name__ == "__main__":
    # Test the connection pool
    import threading
    import random
    
    def test_worker(worker_id: int):
        for i in range(5):
            try:
                with transaction() as conn:
                    with conn.cursor() as cursor:
                        cursor.execute("SELECT 1 as test")
                        result = cursor.fetchone()
                        print(f"Worker {worker_id}, iteration {i}: {result}")
                        time.sleep(random.uniform(0.1, 0.5))
            except Exception as e:
                print(f"Worker {worker_id} error: {e}")
    
    # Run multiple workers
    threads = []
    for i in range(10):
        t = threading.Thread(target=test_worker, args=(i,))
        threads.append(t)
        t.start()
    
    for t in threads:
        t.join()
    
    print("Test completed")