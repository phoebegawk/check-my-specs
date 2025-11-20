# specs_utils.py

from specs_data import SPECS
from typing import Dict, Any
from PIL import Image
from pypdf import PdfReader
import io

# ===========================
# MAIN ENTRY POINT
# ===========================

async def run_checks(file, spec_option) -> Dict[str, Any]:
    """
    Receives the file + dropdown selection and routes to the correct checker.
    """
    specs = SPECS.get(spec_option)

    if not specs:
        return {"status": "error", "message": "Unknown spec selected."}

    filename = file.filename.lower()

    # Read file bytes once (FastAPI UploadFile)
    file_bytes = await file.read()

    if filename.endswith(".jpg") or filename.endswith(".jpeg"):
        return check_jpg(file_bytes, specs)

    elif filename.endswith(".pdf"):
        return check_pdf(file_bytes, specs)

    return {
        "status": "fail",
        "message": "Unsupported file format. Only JPG and PDF are allowed."
    }


# ===========================
# DIGITAL JPG CHECKER
# ===========================

def check_jpg(file_bytes, specs):
    """
    Validates JPG artwork for digital boards.
    Short, clear, client-friendly messages.
    """

    issues = []

    # Try to open image
    try:
        img = Image.open(io.BytesIO(file_bytes))
    except Exception:
        return {
            "status": "fail",
            "message": "❌ Artwork DOES NOT meet specifications.",
            "issues": [
                "File cannot be opened. Please export as a clean .jpg and upload again."
            ]
        }

    # 1. File format (strict .jpg only)
    if img.format != "JPEG":
        issues.append(
            "File type is not .jpg. Please export as a .jpg file and upload again."
        )

    # 2. Dimensions
    expected_w = specs["width_px"]
    expected_h = specs["height_px"]

    if img.width != expected_w:
        issues.append(
            f"Incorrect width. Expected {expected_w}px. Please re-export and upload again."
        )

    if img.height != expected_h:
        issues.append(
            f"Incorrect height. Expected {expected_h}px. Please re-export and upload again."
        )

    # 3. DPI
    dpi = img.info.get("dpi", None)
    expected_dpi = specs["dpi"]

    if not dpi:
        issues.append(
            f"DPI missing. Digital screens require {expected_dpi}dpi. Please re-export and upload again."
        )
    else:
        if dpi[0] != expected_dpi:
            issues.append(
                f"Incorrect DPI. Expected {expected_dpi}dpi. Please re-export and upload again."
            )

    # 4. Colour mode
    if img.mode != "RGB":
        issues.append(
            "Incorrect colour mode. Digital screens require RGB. Please convert and upload again."
        )

    # Final result
    if issues:
        return {
            "status": "fail",
            "message": "❌ Artwork DOES NOT meet specifications.",
            "issues": issues
        }

    return {
        "status": "pass",
        "message": "✅ Artwork meets specifications. Ready for digital upload."
    }

# ===========================
# STATIC PDF CHECKER
# ===========================

def check_pdf(file_bytes, specs):
    """
    Validates PDF artwork for static boards.
    Required fields from specs:
    - width_mm
    - height_mm
    - dpi
    - colour (CMYK)
    - file (PDF)
    """

    try:
        pdf_reader = PdfReader(io.BytesIO(file_bytes))
        page = pdf_reader.pages[0]
    except Exception:
        return {"status": "fail", "message": "Unable to read PDF file."}

    result = {
        "status": "pass",
        "issues": [],
        "details": {}
    }

    # Placeholder checks — to be implemented tonight
    # -------------------------------------------------

    # TODO: extract page size (MediaBox) → mm
    # TODO: check page size == specs width_mm/height_mm EXACTLY
    # TODO: calculate DPI from page size + rendered pixel size
    # TODO: confirm CMYK only
    # TODO: detect bleed via TrimBox/BleedBox mismatch
    # TODO: detect crop/trim marks
    # TODO: enforce single-page PDF
    # TODO: strict matching, no tolerance unless requested

    result["details"]["placeholder"] = "PDF checks to be implemented"

    return result


# ===========================
# HELPER FUNCTIONS (you will fill these out)
# ===========================

def mm_from_points(value_pt: float) -> float:
    """Convert PDF points to millimetres."""
    return value_pt * 0.352778


def get_pdf_page_size_mm(page) -> Dict[str, float]:
    """Extract PDF MediaBox width/height in mm."""
    media = page.mediabox
    width_pt = media[2] - media[0]
    height_pt = media[3] - media[1]
    return {
        "width_mm": mm_from_points(width_pt),
        "height_mm": mm_from_points(height_pt)
    }


def check_colour_cmyk_pdf(page) -> bool:
    """
    Placeholder for CMYK colour check.
    You will implement:
    - scanning content streams for colour operators
    - ensuring no RGB operators appear
    """
    return True  # placeholder


def detect_bleed_or_trim(page) -> Dict[str, bool]:
    """
    Placeholder to detect bleed or trim via PDF boxes.
    Implementation comes tonight.
    """
    return {
        "has_bleed": False,
        "has_trim_marks": False
    }
