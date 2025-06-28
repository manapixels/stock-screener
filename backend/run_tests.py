import sys
import os
import pytest

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

if __name__ == "__main__":
    # Run pytest tests
    pytest.main([os.path.join(os.path.dirname(__file__), 'tests', 'test_crud.py')])
