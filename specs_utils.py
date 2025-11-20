from specs_data import SPECS
from typing import Dict, Any
from PIL import Image
from pypdf import PdfReader
import io

async def run_checks(file, spec_option) -> Dict[str, Any]:
    """
    Main entry point for checking a file against selected specs.
    """
    specs = SPECS.get(spec_option)

    if not specs:
        return {"status": "error", "message": "Unknown spec selected."}

    filename = file.filename.lower()

    if filename.endswith(".jpg") or filename.endswith(".jpeg"):
        return check_jpg(await file.read(), specs)

    elif filename.endswith(".pdf"):
        return check_pdf(await file.read(), specs)

    return {"status": "fail", "message": "Unsupported file format."}


def check_jpg(file_bytes, specs):
    """
    JPG validation logic (digital boards).
    """
    return {"status": "pending", "message": "JPG checker not built yet"}


def check_pdf(file_bytes, specs):
    """
    PDF validation logic (static boards).
    """
    return {"status": "pending", "message": "PDF checker not built yet"}