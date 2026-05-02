import logging
import sys

# Configure logging
def setup_logger():
    logger = logging.getLogger("ai_tutor")
    logger.setLevel(logging.INFO)
    
    # Check if handlers are already added to avoid duplicates with --reload
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    
    return logger

logger = setup_logger()
