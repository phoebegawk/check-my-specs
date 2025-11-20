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

        <!-- WHITE UPLOAD BOX -->
        <div class="upload-container">

            <select id="specSelect" class="dropdown">
                <option value="" disabled selected>Select Board Type + Size</option>
                {options_html}
            </select>

            <div id="drop-area" class="drop-area">
                <p>Drag & drop your artwork here</p>
                <button id="fileBtn" class="gawk-button">Browse Files</button>
                <input type="file" id="fileElem" accept=".jpg,.jpeg,.pdf" />
            </div>

            <!-- Appears after file upload -->
            <div id="upload-confirm" class="upload-confirm hidden">
                File/s uploaded  ⬇️  Click the button below
            </div>

        </div>

        <!-- BUTTON NOW OUTSIDE THE WHITE BOX -->
        <button id="checkBtn" class="gawk-button check-button disabled">
            Check Artwork Specs
        </button>

        <button id="resetBtn" class="gawk-button reset-button">
            Reset
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
    result = await run_checks(file, spec_option)
    return result


if __name__ == "__main__":
    uvicorn.run("specs_app:app", host="0.0.0.0", port=8000, reload=True)
