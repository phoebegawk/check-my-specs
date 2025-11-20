# app.py

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
from specs_utils import run_checks
from specs_data import SPECS

app = FastAPI()

# Serve /assets folder like in your PoP tool
app.mount("/assets", StaticFiles(directory="assets"), name="assets")


@app.get("/", response_class=HTMLResponse)
async def home():
    """
    Serve the Check My Specs front-end page.
    (We embed raw HTML exactly like your PoP Report Builder.)
    """

    # Build dropdown options HTML
    options = ""
    for key in SPECS.keys():
        options += f'<option value="{key}">{key}</option>'

    return f"""
    <html>
    <head>
        <link rel="stylesheet" href="/assets/styles.css">
        <title>Check My Specs</title>
    </head>

    <body>

        <div class="header-container">
            <img src="/assets/Header-CheckMySpecs.png"
                 class="header-image"
                 alt="Check My Specs">
        </div>

        <div class="upload-container">

            <select id="specSelect" class="dropdown">
                <option value="" disabled selected>Select Board Type + Size</option>
                {options}
            </select>

            <div id="drop-area" class="drop-area">
                <p>Drag & drop your artwork here</p>
                <button id="fileBtn" class="gawk-button">Browse Files</button>
                <input type="file" id="fileElem" accept=".jpg,.jpeg,.pdf" />
            </div>

            <button id="checkBtn" class="gawk-button">Check Artwork Specs</button>
        </div>

        <pre id="result"></pre>

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
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
