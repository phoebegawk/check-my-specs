# specs_utils.py

from specs_data import SPECS
from typing import Dict, Any, Optional
from PIL import Image
from pypdf import PdfReader
import io
import math

# ============================================================
# MAIN ENTRY POINT
# ============================================================

async def run_checks(file, spec_option) -> Dict[str, Any]:
    """
    Receives the file + dropdown selection and routes to the correct checker.
    Enforces:
    - Digital specs -> JPG only
    - Static specs  -> PDF only
    """

    specs = SPECS.get(spec_option)

    if not specs:
        return {"status": "error", "message": "Unknown spec selected."}

    filename = file.filename.lower()
    file_bytes = await file.read()
    spec_format = specs.get("format")

    # --------------- DIGITAL (JPG ONLY) ------------------
    if filename.endswith(".jpg") or filename.endswith(".jpeg"):
        if spec_format != "digital":
            return {
                "status": "fail",
                "message": "❌ Artwork DOES NOT meet specifications.",
                "issues": [
                    "File type .jpg is not accepted for this board. "
                    "Static formats must be supplied as a print-ready PDF."
                ],
            }

        # Block .jpeg specifically with a clearer message
        if filename.endswith(".jpeg"):
            return {
                "status": "fail",
                "message": "❌ Artwork DOES NOT meet specifications.",
                "issues": [
                    "File type .jpeg not accepted. "
                    "Please export as .jpg and upload again."
                ],
            }

        return check_jpg(file_bytes, specs)

    # --------------- STATIC (PDF ONLY) -------------------
    elif filename.endswith(".pdf"):
        if spec_format != "static":
            return {
                "status": "fail",
                "message": "❌ Artwork DOES NOT meet specifications.",
                "issues": [
                    "File type PDF is not accepted for digital boards. "
                    "Digital formats must be supplied as a .jpg."
                ],
            }

        return check_pdf(file_bytes, specs)

    # --------------- ANYTHING ELSE -----------------------
    return {
        "status": "fail",
        "message": "❌ Artwork DOES NOT meet specifications.",
        "issues": [
            "Unsupported file type. Only .jpg (digital) or PDF (static) are accepted."
        ],
    }


# ============================================================
# DIGITAL JPG CHECKER
# ============================================================

def check_jpg(file_bytes: bytes, specs: Dict[str, Any]) -> Dict[str, Any]:
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
                "File cannot be opened. Please export as a clean .jpg and re-upload."
            ],
        }

    # 1. File format (strict .jpg only – internal format must be JPEG)
    if img.format != "JPEG":
        issues.append(
            "File type is not .jpg. Please export as .jpg and re-upload."
        )

    # 2. Dimensions (pixels)
    expected_w = specs["width_px"]
    expected_h = specs["height_px"]

    if img.width != expected_w:
        issues.append(
            f"Incorrect width. Expected {expected_w}px. Please adjust and re-upload."
        )

    if img.height != expected_h:
        issues.append(
            f"Incorrect height. Expected {expected_h}px. Please adjust and re-upload."
        )

    # 3. DPI
    expected_dpi = specs["dpi"]
    dpi = img.info.get("dpi")

    if not dpi:
        issues.append(
            f"DPI missing. Digital screens require {expected_dpi}dpi. "
            "Please adjust and re-upload."
        )
    else:
        # Pillow often stores dpi as (x, y)
        x_dpi = int(dpi[0])
        if x_dpi != expected_dpi:
            issues.append(
                f"Incorrect DPI. Digital screens require {expected_dpi}dpi. "
                "Please adjust and re-upload."
            )

    # 4. Colour mode
    if img.mode != "RGB":
        issues.append(
            "Incorrect colour mode. Digital screens require RGB. "
            "Please convert to RGB and re-upload."
        )

    # Final result
    if issues:
        return {
            "status": "fail",
            "message": "❌ Artwork DOES NOT meet specifications.",
            "issues": issues,
        }

    return {
        "status": "pass",
        "message": "✅ Artwork meets specifications. Ready for digital upload.",
    }


# ============================================================
# STATIC PDF CHECKER
# ============================================================

def check_pdf(file_bytes: bytes, specs: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validates PDF artwork for static boards.

    Strict rules:
    - Single-page PDF
    - Page size matches width_mm / height_mm exactly (within tiny float tolerance)
    - No bleed: page size must equal final size
    - No TrimBox / BleedBox / CropBox that differ from page size
    - CMYK only (no RGB colour spaces)
    - Images should be around 300dpi or higher
    """

    issues = []

    # ---------- Open PDF & first page ----------
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        num_pages = len(reader.pages)
        page = reader.pages[0]
    except Exception:
        return {
            "status": "fail",
            "message": "❌ Artwork DOES NOT meet specifications.",
            "issues": [
                "Unable to read PDF file. Please re-upload a clean, print-ready PDF file."
            ],
        }

    # ---------- Single page only ----------
    if num_pages != 1:
        issues.append(
            "Multi-page PDF detected. Please re-upload as single-page PDF."
        )

    # ---------- Page size (mm) ----------
    expected_w_mm = specs["width_mm"]
    expected_h_mm = specs["height_mm"]

    size_mm = get_pdf_page_size_mm(page)
    page_w_mm = size_mm["width_mm"]
    page_h_mm = size_mm["height_mm"]

    # Internal tolerance for float conversions (not exposed to user)
    def nearly(a: float, b: float, tol: float = 0.5) -> bool:
        return abs(a - b) <= tol

    if not (nearly(page_w_mm, expected_w_mm) and nearly(page_h_mm, expected_h_mm)):
        issues.append(
            f"Incorrect page size. Expected {expected_w_mm}mm × {expected_h_mm}mm. "
            f"Detected {round(page_w_mm, 1)}mm × {round(page_h_mm, 1)}mm. "
            "Please re-upload at correct size with no bleed or crop marks."
        )

    # ---------- Bleed / crop detection ----------
    # Any TrimBox / BleedBox / CropBox that differs from the page size = bleed/crop marks.
    trim_size = get_box_size_mm(page, "/TrimBox")
    bleed_size = get_box_size_mm(page, "/BleedBox")
    crop_size = get_box_size_mm(page, "/CropBox")

    if trim_size and (
        not nearly(trim_size["width_mm"], page_w_mm)
        or not nearly(trim_size["height_mm"], page_h_mm)
    ):
        issues.append(
            "Bleed or trim area detected (TrimBox present). "
            "Please remove bleed and crop marks and re-upload."
        )

    if bleed_size and (
        not nearly(bleed_size["width_mm"], page_w_mm)
        or not nearly(bleed_size["height_mm"], page_h_mm)
    ):
        issues.append(
            "Bleed detected. Please re-upload with no bleed."
        )

    if crop_size and (
        not nearly(crop_size["width_mm"], page_w_mm)
        or not nearly(crop_size["height_mm"], page_h_mm)
    ):
        issues.append(
            "Crop marks detected. Please re-upload with no crop marks."
        )

    # Also: if the page itself is clearly larger than spec, treat as bleed.
    if (page_w_mm - expected_w_mm) > 0.5 or (page_h_mm - expected_h_mm) > 0.5:
        issues.append(
            "Bleed detected. Page is larger than the required size. "
            "Please re-upload at final size with no bleed or crop marks."
        )

    # ---------- Colour space: forbid RGB ----------
    if page_has_rgb(page):
        issues.append(
            "RGB colour detected. Static print requires CMYK. "
            "Please convert to CMYK and re-upload."
        )

    # ---------- Approx DPI check for raster images ----------
    min_dpi = estimate_min_image_dpi(page, page_w_mm, page_h_mm)
    expected_dpi = specs["dpi"]

    # Only fail if clearly below spec, to avoid false alarms on vector-only art
    if min_dpi is not None and min_dpi < (expected_dpi - 10):
        issues.append(
            f"Image resolution too low. Minimum detected is around {int(min_dpi)}dpi. "
            f"Static print requires {expected_dpi}dpi. Please adjust and re-upload."
        )

    # ---------- Final result ----------
    if issues:
        return {
            "status": "fail",
            "message": "❌ Artwork DOES NOT meet specifications.",
            "issues": issues,
        }

    return {
        "status": "pass",
        "message": "✅ Artwork meets specifications. Ready to send to print.",
    }


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def mm_from_points(value_pt: float) -> float:
    """Convert PDF points to millimetres."""
    return value_pt * 0.352778  # 1 pt = 1/72 inch; 25.4 / 72 ≈ 0.352778


def get_pdf_page_size_mm(page) -> Dict[str, float]:
    """Extract PDF MediaBox width/height in mm."""
    media = page.mediabox
    width_pt = float(media[2]) - float(media[0])
    height_pt = float(media[3]) - float(media[1])
    return {
        "width_mm": mm_from_points(width_pt),
        "height_mm": mm_from_points(height_pt),
    }


def get_box_size_mm(page, box_name: str) -> Optional[Dict[str, float]]:
    """
    Extracts a given PDF box (/TrimBox, /BleedBox, /CropBox) size in mm.
    Returns None if the box is not present.
    """
    box = page.get(box_name)
    if not box:
        return None

    width_pt = float(box[2]) - float(box[0])
    height_pt = float(box[3]) - float(box[1])

    return {
        "width_mm": mm_from_points(width_pt),
        "height_mm": mm_from_points(height_pt),
    }


def page_has_rgb(page) -> bool:
    """
    Heuristic check for RGB usage in the page's resources.
    Looks for DeviceRGB / CalRGB colour spaces.
    """
    resources = page.get("/Resources")
    if not resources:
        return False

    # Convert resources dict to string and search for RGB colour spaces
    res_str = repr(resources)
    if "DeviceRGB" in res_str or "CalRGB" in res_str:
        return True

    return False


def estimate_min_image_dpi(page, page_w_mm: float, page_h_mm: float) -> Optional[float]:
    """
    Very rough DPI estimate based on image XObjects compared to full page size.

    - If no raster images are found, returns None (likely vector artwork).
    - If images are found, returns the minimum of width/height DPI estimates.
    """

    resources = page.get("/Resources")
    if not resources:
        return None

    xobjects = resources.get("/XObject")
    if not xobjects:
        return None

    page_w_in = page_w_mm / 25.4
    page_h_in = page_h_mm / 25.4

    dpis = []

    for xobj_ref in xobjects.values():
        try:
            xobj = xobj_ref.get_object()
        except Exception:
            continue

        if xobj.get("/Subtype") != "/Image":
            continue

        width_px = xobj.get("/Width")
        height_px = xobj.get("/Height")

        if not width_px or not height_px:
            continue

        # Assume image roughly spans the page – gives a conservative estimate
        dpi_w = width_px / page_w_in if page_w_in > 0 else 0
        dpi_h = height_px / page_h_in if page_h_in > 0 else 0

        if dpi_w > 0:
            dpis.append(dpi_w)
        if dpi_h > 0:
            dpis.append(dpi_h)

    if not dpis:
        return None

    return min(dpis)
