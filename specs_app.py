# specs_app.py

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
from specs_utils import run_checks
from specs_data import SPECS

app = FastAPI()

# Serve CSS, JS, images
app.mount("/assets", StaticFiles(directory="assets"), name="assets")


@app.get("/", response_class=HTMLResponse)
async def home():
    """
    Front-end for Check My Specs
    """

    # Build dropdown option list
    options_html = "".join(
        f'<option value="{key}">{key}</option>' for key in SPECS.keys()
    )

    return f"""
    <html>
    <head>
        <link rel="stylesheet" href="/assets/styles.css">
        <title>Check My Specs</title>
    </head>

    <body>

        <!-- HEADER -->
        <div class="header-container">
            <img src="/assets/Header-CheckMySpecs.png"
                 class="header-image"
                 alt="Check My Specs">
        </div>

        <!-- MAIN SECTIONS WRAPPER -->
        <div id="sections-container">

            <!-- FIRST SECTION (template for cloning) -->
            <div class="spec-section">
                <div class="section-inner">

                    <select class="dropdown spec-select">
                        <option value="" disabled selected>Select Board Type + Size</option>
                        {options_html}
                    </select>

                    <div class="drop-area">
                        <p>Drag &drop artwork here</p>
                        <button class="gawk-button browse-btn">Browse Files</button>
                        <input type="file"
                               class="file-input"
                               accept=".jpg,.jpeg,.pdf"
                               multiple />
                    </div>

                    <!-- Upload overlay (per section) -->
                    <div class="upload-overlay hidden">
                        <div class="overlay-content">
                            <div class="overlay-spinner"></div>
                            <p>Uploading...</p>
                        </div>
                    </div>

                    <!-- Upload confirmation -->
                    <div class="upload-confirm hidden">
                        File(s) uploaded! Click “Check Specs”.
                    </div>

                    <!-- Inline results area for this section -->
                    <div class="section-results hidden"></div>

                </div>
            </div>
        </div>

        <!-- GLOBAL SPEC-CHECK OVERLAY -->
        <div id="specCheckOverlay" class="spec-check-overlay hidden">
            <div class="overlay-content">
                <div class="overlay-spinner"></div>
                <p>Checking specs...</p>
            </div>
        </div>

        <!-- ACTION BUTTONS -->
        <div class="actions-row">
            <button id="addSizeBtn" class="gawk-button secondary-button">
                + Add another size
            </button>

            <button id="checkBtn" class="gawk-button check-button disabled">
                Check Specs
            </button>
        </div>

        <button id="resetAllBtn" class="gawk-button reset-button">
            Reset all
        </button>

        <script src="/assets/scripts.js"></script>

    </body>
    </html>
    """


@app.post("/check")
async def check_specs(
    spec_option: str = Form(...),
    file: UploadFile = File(...)
):
    result = await run_checks(file, spec_option)
    return result


if __name__ == "__main__":
    uvicorn.run("specs_app:app", host="0.0.0.0", port=8000, reload=True)
