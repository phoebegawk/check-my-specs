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
    Serve the Check My Specs front-end interface (multi-size mode).
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

            <!-- FIRST SECTION (index 1) -->
            <div class="spec-section" data-index="1">

                <!-- WHITE UPLOAD BOX -->
                <div class="upload-container">

                    <select class="dropdown spec-select">
                        <option value="" disabled selected>Select Board Type + Size</option>
                        {options_html}
                    </select>

                    <div class="drop-area">
                        <p>Drag & drop artwork here.</p>
                        <button class="gawk-button fileBtn">Browse Files</button>
                        <input type="file"
                               class="fileElem"
                               accept=".jpg,.jpeg,.pdf"
                               multiple />
                    </div>

                    <div class="upload-overlay hidden">
                        <div class="overlay-content">
                            <div class="overlay-spinner"></div>
                            <p>Uploading...</p>
                        </div>
                    </div>

                    <!-- Appears after file upload -->
                    <div class="upload-confirm hidden">
                        Files uploaded! Click the button below.
                    </div>

                </div>

                <!-- BUTTONS + RESULT FOR THIS SECTION -->
                <button class="gawk-button check-button disabled">
                    Check Artwork Specs
                </button>

                <button class="gawk-button reset-section-button">
                    Reset this size
                </button>

                <div class="result-container hidden">
                    <pre class="result"></pre>
                </div>

            </div> <!-- /spec-section -->

        </div> <!-- /sections-container -->


        <!-- TEMPLATE FOR NEW SECTIONS (CLONED BY JS) -->
        <template id="spec-section-template">
            <div class="spec-section" data-index="">
                <div class="upload-container">

                    <select class="dropdown spec-select">
                        <option value="" disabled selected>Select Board Type + Size</option>
                        {options_html}
                    </select>

                    <div class="drop-area">
                        <p>Drag & drop artwork here.</p>
                        <button class="gawk-button fileBtn">Browse Files</button>
                        <input type="file"
                               class="fileElem"
                               accept=".jpg,.jpeg,.pdf"
                               multiple />
                    </div>

                    <div class="upload-overlay hidden">
                        <div class="overlay-content">
                            <div class="overlay-spinner"></div>
                            <p>Uploading...</p>
                        </div>
                    </div>

                    <div class="upload-confirm hidden">
                        Files uploaded! Click the button below.
                    </div>
                </div>

                <button class="gawk-button check-button disabled">
                    Check Artwork Specs
                </button>

                <button class="gawk-button reset-section-button">
                    Reset this size
                </button>

                <div class="result-container hidden">
                    <pre class="result"></pre>
                </div>
            </div>
        </template>

        <!-- GLOBAL ACTIONS -->
        <button id="addSizeBtn" class="gawk-button add-size-button">
            + Add another size
        </button>

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
    """
    NOTE: Still checks ONE file per request.
    Multi-file support is handled in the frontend by calling this endpoint
    once per file and aggregating the results.
    """
    result = await run_checks(file, spec_option)
    return result


if __name__ == "__main__":
    uvicorn.run("specs_app:app", host="0.0.0.0", port=8000, reload=True)
