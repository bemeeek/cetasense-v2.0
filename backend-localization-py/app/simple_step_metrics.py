import os
import time
import threading
from datetime import datetime, timezone, timedelta
from typing import Optional
import portalocker  # type: ignore
from contextvars import ContextVar
import uuid
import asyncio
import logging
from .setup_redis import redis_client

# Setup logger
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

WIB = timezone(timedelta(hours=7))  # Waktu Indonesia Barat (WIB)

class StepsMetrics:
    def __init__(self):
        self._lock = threading.Lock()
        self.steps_file = None
        self.service_name = None
        self.debug_mode = False
    
    def init(self, steps_file: str = "step_metrics.csv", service_name: str = "unknown", debug: bool = False):
        """Initialize steps metrics dengan service identifier"""
        os.makedirs(os.path.dirname(steps_file) if os.path.dirname(steps_file) else ".", exist_ok=True)
        
        self.steps_file = steps_file
        self.service_name = service_name
        self.debug_mode = debug
        
        if self.debug_mode:
            logger.info(f"✅ [{service_name}] Initializing steps metrics with file: {steps_file}")
        
        if not os.path.exists(steps_file) or os.path.getsize(steps_file) == 0:
            self._write_csv_line("timestamp,reqID,service,stepName,duration_ms")
        
        if self.debug_mode:
            logger.info(f"✅ [{service_name}] Steps metrics initialized: {steps_file}")
    
    def _write_csv_line(self, line: str):
        """Write to CSV dengan file locking dan retry mechanism"""
        if not self.steps_file:
            if self.debug_mode:
                logger.error(f"❌ [{self.service_name}] No steps file configured")
            return
            
        max_retries = 3
        retry_delay = 0.01  # 10ms
        
        for attempt in range(max_retries):
            try:
                with open(self.steps_file, 'a', encoding='utf-8') as f:
                    portalocker.lock(f, portalocker.LOCK_EX)
                    f.write(line + "\n")
                    f.flush()
                    os.fsync(f.fileno())  # Force write to disk
                
                if self.debug_mode and attempt > 0:
                    logger.info(f"✅ [{self.service_name}] CSV write successful on attempt {attempt + 1}")
                return
            except Exception as e:
                if attempt < max_retries - 1:
                    if self.debug_mode:
                        logger.warning(f"⚠️  [{self.service_name}] CSV write attempt {attempt + 1} failed: {e}, retrying...")
                    time.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                else:
                    logger.error(f"❌ [{self.service_name}] CSV write failed after {max_retries} attempts: {e}")

    def step(self, req_id: str, step_name: str, duration_ms: float):
        """Log step timing dengan service identifier"""
        if not req_id:
            req_id = "no-req-id"
            
        timestamp = datetime.now(WIB).strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        line = f"{timestamp},{req_id},{self.service_name},{step_name},{duration_ms:.2f}"
        
        if self.debug_mode:
            logger.info(f"📊 [{self.service_name}] Logging step: {req_id} -> {step_name} ({duration_ms:.2f}ms)")
        
        self._write_csv_line(line)

# Global instance per process
_steps_metrics = StepsMetrics()

# Context variable untuk async environments
_request_id: ContextVar[Optional[str]] = ContextVar('request_id', default=None)

def init_steps_metrics(steps_file: str = "step_metrics.csv", service_name: str = "unknown", debug: bool = False):
    _steps_metrics.init(steps_file, service_name, debug)

def step(req_id: str, step_name: str, duration_ms: float):
    _steps_metrics.step(req_id, step_name, duration_ms)

def get_request_id() -> Optional[str]:
    """Get current request ID dari context"""
    try:
        return _request_id.get()
    except LookupError:
        return None

def set_request_id(req_id: str):
    """Set request ID untuk current context"""
    try:
        _request_id.set(req_id)
    except Exception as e:
        logger.warning(f"⚠️ Could not set context var request_id: {e}")

def generate_request_id() -> str:
    return str(uuid.uuid4())

class StepTimer:
    """Context manager untuk mengukur waktu step dengan improved async support"""
    
    def __init__(self, req_id: str, step_name: str, service_name: Optional[str] = None):
        self.req_id = req_id
        self.step_name = step_name
        self.service_name = service_name or _steps_metrics.service_name or "unknown"
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

# Async-safe step function
async def async_step(req_id: str, step_name: str, duration_ms: float):
    """Async-safe version of step function"""
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, step, req_id, step_name, duration_ms)

class AsyncStepTimer:
    """Async version of StepTimer"""
    
    def __init__(self, req_id: str, step_name: str, service_name: Optional[str] = None):
        self.req_id = req_id
        self.step_name = step_name
        self.service_name = service_name or _steps_metrics.service_name or "unknown"
        self.start_time = None
    
    async def __aenter__(self):
        self.start_time = time.time()
        await async_step(self.req_id, f"{self.step_name}_START", 0.0)
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.start_time:
            duration_ms = (time.time() - self.start_time) * 1000
            if exc_type is None:
                await async_step(self.req_id, f"{self.step_name}_END", duration_ms)
            else:
                await async_step(self.req_id, f"{self.step_name}_ERROR", duration_ms)
