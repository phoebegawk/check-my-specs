// scripts.js — Check My Specs

const dropArea = document.getElementById("drop-area");
const fileElem = document.getElementById("fileElem");
const fileBtn = document.getElementById("fileBtn");
const checkBtn = document.getElementById("checkBtn");
const resultContainer = document.getElementById("result-container");
const resultBox = document.getElementById("result");
const uploadOverlay = document.getElementById("uploadOverlay");
const uploadConfirm = document.getElementById("upload-confirm");

let selectedFile = null;

// Disable button on page load
checkBtn.classList.add("disabled");

/* ---------------------------------------
   CLICK → Open File Picker
---------------------------------------- */
fileBtn.addEventListener("click", () => fileElem.click());

/* ---------------------------------------
   BROWSER FILE SELECTION
---------------------------------------- */
fileElem.addEventListener("change", (event) => {
    selectedFile = event.target.files[0];

    if (selectedFile) {
        uploadOverlay.classList.remove("hidden");

        setTimeout(() => {
            uploadOverlay.classList.add("hidden");
            uploadConfirm.classList.remove("hidden");
            checkBtn.classList.remove("disabled");
        }, 800);
    }
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

    if (selectedFile) {
        uploadOverlay.classList.remove("hidden");

        setTimeout(() => {
            uploadOverlay.classList.add("hidden");
            uploadConfirm.classList.remove("hidden");
            checkBtn.classList.remove("disabled");
        }, 800);
    }
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

    // PASS -----------------------------------------
    if (data.status === "pass") {
        resultBox.innerHTML = `
            <div style="
                color:#2a7a34;
                font-weight:700;
                font-size:20px;
                padding:10px 0;
                text-align:center;">
                ${data.message}
            </div>
        `;
    }

    // FAIL -----------------------------------------
    else {
        const issuesHtml = data.issues
            .map(i => `<div style="margin-bottom:10px;">${i}</div>`)
            .join("");

        resultBox.innerHTML = `
            <div style="
                color:#b00020;
                font-weight:700;
                font-size:20px;
                padding:10px 0;
                text-align:center;">
                ${data.message}
            </div>

            <div style="
                color:#333;
                font-size:16px;
                text-align:center;
                margin-top:10px;">
                ${issuesHtml}
            </div>
        `;
    }

    resultContainer.classList.remove("hidden");

    // Auto-scroll to result
    resultContainer.scrollIntoView({ behavior: "smooth" });
});

const resetBtn = document.getElementById("resetBtn");

resetBtn.addEventListener("click", () => {
    // Clear selected file
    selectedFile = null;
    fileElem.value = "";

    // Reset dropdown
    document.getElementById("specSelect").value = "";

    // Hide upload confirmation
    document.getElementById("upload-confirm").classList.add("hidden");

    // Hide result box
    resultContainer.classList.add("hidden");
    resultBox.innerHTML = "";

    // Disable check button again
    checkBtn.classList.add("disabled");

    // Scroll back up to upload box smoothly
    document.querySelector(".upload-container").scrollIntoView({
        behavior: "smooth"
    });
});
