import os
import time
import threading
from datetime import datetime, timezone, timedelta
from typing import Optional
import portalocker # type: ignore
from contextvars import ContextVar
import uuid
from .setup_redis import redis_client


WIB = timezone(timedelta(hours=7))  # Waktu Indonesia Barat (WIB)
# Context variable untuk request ID
_request_id: ContextVar[Optional[str]] = ContextVar('request_id', default=None)

class StepsMetrics:
    def __init__(self):
        self._lock = threading.Lock()
        self.steps_file = None
    
    def init(self, steps_file: str = "step_metrics.csv"):
        """Initialize steps metrics - GUNAKAN FILE YANG SAMA"""
        # Pastikan direktori ada
        os.makedirs(os.path.dirname(steps_file) if os.path.dirname(steps_file) else ".", exist_ok=True)
        
        self.steps_file = steps_file
        
        print(f"✅ Initializing steps metrics with file: {steps_file}")
        # Initialize header jika file belum ada
        if not os.path.exists(steps_file) or os.path.getsize(steps_file) == 0:
            self._write_csv_line("timestamp,reqID,stepName,duration_ms")
        
        print(f"✅ Steps metrics initialized: {steps_file}")
    
    def _write_csv_line(self, line: str):
        """Write to CSV dengan file locking"""
        if not self.steps_file:
            return
            
        try:
            with open(self.steps_file, 'a', encoding='utf-8') as f:
                portalocker.lock(f, portalocker.LOCK_EX)
                f.write(line + "\n")
                f.flush()
        except Exception as e:
            print(f"Error writing to CSV: {e}")

    def step(self, req_id: str, step_name: str, duration_ms: float):
        """Log step timing"""
        timestamp = datetime.now(WIB).strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        line = f"{timestamp},{req_id},{step_name},{duration_ms:.2f}"
        self._write_csv_line(line)

# Global instance
_steps_metrics = StepsMetrics()

# Public functions
def init_steps_metrics(steps_file: str = "step_metrics.csv"):
    """Initialize steps metrics"""
    _steps_metrics.init(steps_file)

def step(req_id: str, step_name: str, duration_ms: float):
    """Log step timing"""
    _steps_metrics.step(req_id, step_name, duration_ms)

def get_request_id() -> Optional[str]:
    """Get current request ID"""
    return _request_id.get()

def set_request_id(req_id: str):
    """Set request ID untuk current context"""
    _request_id.set(req_id)

def generate_request_id() -> str:
    """Generate new request ID"""
    return str(uuid.uuid4())

class StepTimer:
    """Context manager untuk mengukur waktu step"""
    
    def __init__(self, req_id: str, step_name: str):
        self.req_id = req_id
        self.step_name = step_name
        self.start_time = None
    
    def __enter__(self):
        self.start_time = time.time()
        step(self.req_id, f"{self.step_name}_START", 0.0)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.start_time:
            duration_ms = (time.time() - self.start_time) * 1000
            if exc_type is None:
                step(self.req_id, f"{self.step_name}_END", duration_ms)
            else:
                step(self.req_id, f"{self.step_name}_ERROR", duration_ms)