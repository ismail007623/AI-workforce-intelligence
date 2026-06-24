# app/core/logger.py
import logging
from datetime import datetime
from pathlib import Path

# Define log file in workspace root
log_file = Path(__file__).resolve().parents[2] / "AI_workforc_intelligence.log"

# --- Color formatter class (only colors levelname) ---
class ColorFormatter(logging.Formatter):
    COLORS = {
        'DEBUG': '\033[36m',   # Cyan
        'INFO': '\033[34m',    # Blue
        'WARNING': '\033[33m', # Yellow/Orange
        'ERROR': '\033[31m',   # Red
        'CRITICAL': '\033[41m' # Red background
    }
    RESET = '\033[0m'

    def format(self, record):
        # Save original levelname
        original_levelname = record.levelname
        # Color only the levelname
        color = self.COLORS.get(record.levelname, self.RESET)
        record.levelname = f"{color}{record.levelname}{self.RESET}"
        # Format the message
        message = super().format(record)
        # Restore original levelname (important for file handler)
        record.levelname = original_levelname
        return message

# --- Create formatters ---
file_formatter = logging.Formatter("%(asctime)s | %(levelname)s | %(name)s | %(message)s")
color_formatter = ColorFormatter("%(asctime)s | %(levelname)s | %(name)s | %(message)s")

# --- Create handlers ---
file_handler = logging.FileHandler(log_file)
file_handler.setFormatter(file_formatter)

console_handler = logging.StreamHandler()
console_handler.setFormatter(color_formatter)

# --- Configure logging ---
logging.basicConfig(
    level=logging.INFO,
    handlers=[file_handler, console_handler]
)

def get_logger(name: str):
    return logging.getLogger(name)