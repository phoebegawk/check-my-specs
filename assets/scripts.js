// scripts.js — Check My Specs (multi-size mode)

// Container of all sections
const sectionsContainer = document.getElementById("sections-container");
const sectionTemplate = document.getElementById("spec-section-template");
const addSizeBtn = document.getElementById("addSizeBtn");
const resetAllBtn = document.getElementById("resetAllBtn");

// ------------------------------
// Setup logic for a single section
// ------------------------------
function setupSection(sectionEl) {

    const specSelect      = sectionEl.querySelector(".spec-select");
    const dropArea        = sectionEl.querySelector(".drop-area");
    const fileElem        = sectionEl.querySelector(".fileElem");
    const fileBtn         = sectionEl.querySelector(".fileBtn");
    const checkBtn        = sectionEl.querySelector(".check-button");
    const uploadOverlay   = sectionEl.querySelector(".upload-overlay");
    const uploadConfirm   = sectionEl.querySelector(".upload-confirm");
    const resultContainer = sectionEl.querySelector(".result-container");
    const resultBox       = sectionEl.querySelector(".result");
    const resetSectionBtn = sectionEl.querySelector(".reset-section-button");

    let selectedFiles = [];

    // Disable check by default
    checkBtn.classList.add("disabled");

    // -------------------------
    // Helper: handle files selected (from picker or drop)
    // -------------------------
    function handleFilesSelected(files) {
        selectedFiles = files || [];
        if (!selectedFiles.length) return;

        // Show overlay
        uploadOverlay.classList.remove("hidden");

        // Clear old state
        uploadConfirm.classList.add("hidden");
        resultContainer.classList.add("hidden");
        resultBox.innerHTML = "";

        // Fake a short "uploading" delay for UX
        setTimeout(() => {
            uploadOverlay.classList.add("hidden");
            uploadConfirm.classList.remove("hidden");
            checkBtn.classList.remove("disabled");
        }, 600);
    }

    // -------------------------
    // File picker
    // -------------------------
    fileBtn.addEventListener("click", () => fileElem.click());

    fileElem.addEventListener("change", (event) => {
        const files = Array.from(event.target.files || []);
        handleFilesSelected(files);
    });

    // -------------------------
    // Drag & Drop
    // -------------------------
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
        const files = Array.from(event.dataTransfer.files || []);
        handleFilesSelected(files);
    });

    // -------------------------
    // Check Artwork Specs — per section
    // -------------------------
    checkBtn.addEventListener("click", async () => {

        if (checkBtn.classList.contains("disabled")) {
            return;
        }

        const specOption = specSelect.value;

        if (!specOption) {
            alert("Please select a board type + size.");
            return;
        }

        if (!selectedFiles.length) {
            alert("Please upload at least one file.");
            return;
        }

        // Show immediate feedback
        resultContainer.classList.remove("hidden");
        resultBox.innerHTML = "Checking artwork specs...";

        const perFileResults = [];

        for (const file of selectedFiles) {

            const formData = new FormData();
            formData.append("file", file);
            formData.append("spec_option", specOption);

            try {
                const response = await fetch("/check", {
                    method: "POST",
                    body: formData
                });

                const data = await response.json();
                perFileResults.push({ file, data });

            } catch (error) {
                perFileResults.push({
                    file,
                    data: {
                        status: "fail",
                        message: "❌ Error checking this file.",
                        issues: [
                            "An unexpected error occurred. Please try again."
                        ]
                    }
                });
            }
        }

        // Build output
        let allPass = perFileResults.every(r => r.data.status === "pass");

        if (perFileResults.length === 1) {
            // Single file (keep it nice & bold)
            const { file, data } = perFileResults[0];

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
                    <div style="
                        color:#333;
                        font-size:14px;
                        text-align:center;
                        margin-top:6px;">
                        File: ${file.name}
                    </div>
                `;
            } else {
                const issues = (data.issues || [])
                    .map(i => `<div style="margin-bottom:8px;">${i}</div>`)
                    .join("");

                resultBox.innerHTML = `
                    <div style="
                        color:#b00020;
                        font-weight:700;
                        font-size:20px;
                        padding:10px 0;
                        text-align:center;">
                        ${data.message || "❌ Artwork DOES NOT meet specifications."}
                    </div>

                    <div style="
                        color:#333;
                        font-size:16px;
                        text-align:center;
                        margin-top:10px;">
                        ${issues}
                    </div>

                    <div style="
                        color:#333;
                        font-size:14px;
                        text-align:center;
                        margin-top:6px;">
                        File: ${file.name}
                    </div>
                `;
            }
        } else {
            // Multiple files — show summary + per-file lines
            let html = "";

            for (const { file, data } of perFileResults) {
                if (data.status === "pass") {
                    html += `
                        <div style="margin-bottom:10px;">
                            <strong>${file.name}</strong><br/>
                            <span style="color:#2a7a34;">
                                ${data.message}
                            </span>
                        </div>
                    `;
                } else {
                    const issues = (data.issues || [])
                        .map(i => `<div style="margin-bottom:4px;">${i}</div>`)
                        .join("");

                    html += `
                        <div style="margin-bottom:14px;">
                            <strong>${file.name}</strong><br/>
                            <span style="color:#b00020;">
                                ${data.message || "❌ Artwork DOES NOT meet specifications."}
                            </span>
                            <div style="color:#333;font-size:14px;margin-top:4px;">
                                ${issues}
                            </div>
                        </div>
                    `;
                }
            }

            const summaryLine = allPass
                ? `<div style="
                        color:#2a7a34;
                        font-weight:700;
                        font-size:18px;
                        margin-bottom:12px;
                        text-align:center;">
                        All files meet specifications.
                   </div>`
                : `<div style="
                        color:#b00020;
                        font-weight:700;
                        font-size:18px;
                        margin-bottom:12px;
                        text-align:center;">
                        Some files do not meet specifications.
                   </div>`;

            resultBox.innerHTML = summaryLine + html;
        }

        resultContainer.classList.remove("hidden");
        resultContainer.scrollIntoView({ behavior: "smooth" });
    });

    // -------------------------
    // Reset THIS section
    // -------------------------
    resetSectionBtn.addEventListener("click", () => {
        selectedFiles = [];
        fileElem.value = "";
        specSelect.value = "";

        uploadConfirm.classList.add("hidden");
        resultContainer.classList.add("hidden");
        resultBox.innerHTML = "";

        checkBtn.classList.add("disabled");

        // Nice UX: scroll back up to this section
        sectionEl.scrollIntoView({ behavior: "smooth" });
    });
}

// ------------------------------
// INITIALISE EXISTING SECTION(S)
// ------------------------------
document.querySelectorAll(".spec-section").forEach(setupSection);

// ------------------------------
// ADD ANOTHER SIZE
// ------------------------------
let sectionCounter = document.querySelectorAll(".spec-section").length;

addSizeBtn.addEventListener("click", () => {
    sectionCounter += 1;

    const clone = sectionTemplate.content.firstElementChild.cloneNode(true);
    clone.setAttribute("data-index", String(sectionCounter));

    sectionsContainer.appendChild(clone);
    setupSection(clone);

    clone.scrollIntoView({ behavior: "smooth" });
});

// ------------------------------
// RESET ALL
// ------------------------------
resetAllBtn.addEventListener("click", () => {
    const sections = sectionsContainer.querySelectorAll(".spec-section");

    sections.forEach((section, index) => {
        if (index === 0) {
            // Keep the first section, just reset it
            const specSelect      = section.querySelector(".spec-select");
            const fileElem        = section.querySelector(".fileElem");
            const uploadConfirm   = section.querySelector(".upload-confirm");
            const resultContainer = section.querySelector(".result-container");
            const resultBox       = section.querySelector(".result");
            const checkBtn        = section.querySelector(".check-button");

            fileElem.value = "";
            specSelect.value = "";
            uploadConfirm.classList.add("hidden");
            resultContainer.classList.add("hidden");
            resultBox.innerHTML = "";
            checkBtn.classList.add("disabled");
        } else {
            // Remove any extra sections
            section.remove();
        }
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
});
