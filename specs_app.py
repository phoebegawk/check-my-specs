# specs_app.py

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
from specs_utils import run_checks
from specs_data import SPECS

app = FastAPI()

# Serve static assets (CSS, JS, images)
app.mount("/assets", StaticFiles(directory="assets"), name="assets")


@app.get("/", response_class=HTMLResponse)
async def home():
    """
    Serve the Check My Specs front-end interface.
    """

    # Build dynamic dropdown options from specs_data
    options_html = ""
    for key in SPECS.keys():
        options_html += f'<option value="{key}">{key}</option>'

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

        <!-- ALL SIZE SECTIONS LIVE HERE -->
        <div id="sections-container">

            <!-- FIRST SIZE SECTION (used as template as well) -->
            <div class="upload-container spec-section">

                <select class="dropdown spec-select">
                    <option value="" disabled selected>Select Board Type + Size</option>
                    {options_html}
                </select>

                <div class="drop-area">
                    <p>Drag & drop artwork here.</p>
                    <button class="gawk-button browse-btn">Browse Files</button>
                    <!-- allow multiple files per size -->
                    <input type="file"
                           class="file-input"
                           accept=".jpg,.jpeg,.pdf"
                           multiple />
                </div>

                <!-- Upload overlay for this section -->
                <div class="upload-overlay hidden">
                    <div class="overlay-content">
                        <div class="overlay-spinner"></div>
                        <p>Uploading...</p>
                    </div>
                </div>

                <!-- Appears after file upload for this section -->
                <div class="upload-confirm hidden">
                    File(s) uploaded! Click “Check Artwork Specs” below.
                </div>

            </div>
        </div>

        <!-- MAIN ACTION BUTTONS -->
        <div class="actions-row">
            <button id="addSizeBtn" class="gawk-button secondary-button">
                + Add another size
            </button>

            <button id="checkBtn" class="gawk-button check-button disabled">
                Check Artwork Specs
            </button>
        </div>

        <button id="resetAllBtn" class="gawk-button reset-button">
            Reset all
        </button>

        <!-- RESULT OUTPUT BOX -->
        <div id="result-container" class="result-container hidden">
            <pre id="result"></pre>
        </div>

        <script src="/assets/scripts.js"></script>

    </body>
    </html>
    """


@app.post("/check")
async def check_specs(
    spec_option: str = Form(...),
    file: UploadFile = File(...)
):
    # unchanged – still checks ONE file + ONE size
    result = await run_checks(file, spec_option)
    return result


if __name__ == "__main__":
    uvicorn.run("specs_app:app", host="0.0.0.0", port=8000, reload=True)
