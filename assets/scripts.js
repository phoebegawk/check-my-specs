// scripts.js — Check My Specs
// Mirrors PoP Report Builder behaviour

const dropArea = document.getElementById("drop-area");
const fileElem = document.getElementById("fileElem");
const fileBtn = document.getElementById("fileBtn");
const checkBtn = document.getElementById("checkBtn");
const resultContainer = document.getElementById("result-container");
const resultBox = document.getElementById("result");

let selectedFile = null;

/* ---------------------------------------
   CLICK → Open File Picker
---------------------------------------- */
fileBtn.addEventListener("click", () => fileElem.click());

/* ---------------------------------------
   BROWSER FILE SELECTION
---------------------------------------- */
fileElem.addEventListener("change", (event) => {
    selectedFile = event.target.files[0];
});

/* ---------------------------------------
   DRAG & DROP BEHAVIOUR
---------------------------------------- */
dropArea.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropArea.classList.add("drag-over");
});

dropArea.addEventListener("dragleave", () => {
    dropArea.classList.remove("drag-over");
});

dropArea.addEventListener("drop", (event) => {
    event.preventDefault();
    dropArea.classList.remove("drag-over");
    selectedFile = event.dataTransfer.files[0];
});

/* ---------------------------------------
   SUBMIT → Send File to Backend (PRETTY OUTPUT)
---------------------------------------- */
checkBtn.addEventListener("click", async () => {

    const specOption = document.getElementById("specSelect").value;

    if (!specOption) {
        alert("Please select a board type + size.");
        return;
    }

    if (!selectedFile) {
        alert("Please upload a file.");
        return;
    }

    // Build form for backend
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("spec_option", specOption);

    // Send to FastAPI
    const response = await fetch("/check", {
        method: "POST",
        body: formData
    });

    const data = await response.json();

    const result = document.getElementById("result");
    const resultContainer = document.getElementById("result-container");

    /* PASS ----------------------------------------- */
    if (data.status === "pass") {
        result.innerHTML = `
            <div style="color:#2a7a34;
                        font-weight:700;
                        font-size:20px;
                        padding:10px 0;">
                ${data.message}
            </div>
        `;
    }

    /* FAIL ----------------------------------------- */
    else {
        const issuesHtml = data.issues
            .map(i => `<li style="margin-bottom:8px;">${i}</li>`)
            .join("");

        result.innerHTML = `
            <div style="color:#b00020;
                        font-weight:700;
                        font-size:20px;
                        padding:10px 0;">
                ${data.message}
            </div>

            <ul style="color:#333;
                       font-size:16px;
                       padding-left:20px;
                       margin-top:0;">
                ${issuesHtml}
            </ul>
        `;
    }

    resultContainer.classList.remove("hidden");

    // OPTIONAL: auto scroll into view
    resultContainer.scrollIntoView({ behavior: "smooth" });
});
