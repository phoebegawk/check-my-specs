// scripts.js — Check My Specs (multi-size, multi-file)

// GLOBAL ELEMENTS
const sectionsContainer   = document.getElementById("sections-container");
const addSizeBtn          = document.getElementById("addSizeBtn");
const checkBtn            = document.getElementById("checkBtn");
const resetAllBtn         = document.getElementById("resetAllBtn");
const specCheckOverlay    = document.getElementById("specCheckOverlay");

// STATE
let nextSectionId = 1;
// Each entry: { id, rootEl, specSelect, dropArea, browseBtn, fileInput, uploadOverlay, uploadConfirm, files: [] }
const sections = [];

// Disable check button on load
checkBtn.classList.add("disabled");
checkBtn.disabled = true;

// --------------------------------------
// INIT HELPERS
// --------------------------------------

function initExistingSections() {
    const sectionEls = document.querySelectorAll(".spec-section");
    sectionEls.forEach((el) => initSection(el));
}

function initSection(sectionEl) {
    const id = nextSectionId++;
    sectionEl.dataset.sectionId = String(id);

    const specSelect     = sectionEl.querySelector(".spec-select");
    const dropArea       = sectionEl.querySelector(".drop-area");
    const browseBtn      = sectionEl.querySelector(".browse-btn");
    const fileInput      = sectionEl.querySelector(".file-input");
    const uploadOverlay  = sectionEl.querySelector(".upload-overlay");
    const uploadConfirm  = sectionEl.querySelector(".upload-confirm");

    const state = {
        id,
        rootEl: sectionEl,
        specSelect,
        dropArea,
        browseBtn,
        fileInput,
        uploadOverlay,
        uploadConfirm,
        files: []
    };
    sections.push(state);

    // Browse click → open file picker
    browseBtn.addEventListener("click", () => fileInput.click());

    // File picker selection
    fileInput.addEventListener("change", (event) => {
        const files = Array.from(event.target.files || []);
        handleFilesSelected(state, files);
    });

    // Drag & drop
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
        handleFilesSelected(state, files);
    });
}

function handleFilesSelected(section, files) {
    if (!files.length) return;

    // Store files for this section
    section.files = files;

    // Clear any previous results in this section
    const resultsBox = section.rootEl.querySelector(".section-results");
    if (resultsBox) {
        resultsBox.innerHTML = "";
        resultsBox.classList.add("hidden");
    }

    // Show per-section overlay briefly, then confirmation
    if (section.uploadOverlay) section.uploadOverlay.classList.remove("hidden");
    if (section.uploadConfirm) section.uploadConfirm.classList.add("hidden");

    setTimeout(() => {
        if (section.uploadOverlay) section.uploadOverlay.classList.add("hidden");
        if (section.uploadConfirm) section.uploadConfirm.classList.remove("hidden");
    }, 800);

    enableCheckButton();
}

function enableCheckButton() {
    checkBtn.classList.remove("disabled");
    checkBtn.disabled = false;
}

// --------------------------------------
// CHECK BUTTON — RUNS ALL FILES
// --------------------------------------

checkBtn.addEventListener("click", async () => {
    if (checkBtn.classList.contains("disabled")) {
        return;
    }

    const activeSections = sections.filter(s => s.files && s.files.length > 0);

    if (!activeSections.length) {
        alert("Please upload at least one file.");
        return;
    }

    // Ensure each section with files has a size selected
    for (const s of activeSections) {
        if (!s.specSelect.value) {
            alert("Please select a board type + size for each uploaded artwork.");
            s.rootEl.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }
    }

    const allResults = [];

    // Show global spec-check overlay
    if (specCheckOverlay) {
        specCheckOverlay.classList.remove("hidden");
    }

    try {
        // Sequentially call /check for each file
        for (const s of activeSections) {
            const specName = s.specSelect.value;

            for (const file of s.files) {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("spec_option", specName);

                try {
                    const response = await fetch("/check", {
                        method: "POST",
                        body: formData
                    });

                    const data = await response.json();

                    allResults.push({
                        spec: specName,
                        fileName: file.name,
                        status: data.status,
                        message: data.message || "",
                        issues: data.issues || []
                    });
                } catch (err) {
                    allResults.push({
                        spec: specName,
                        fileName: file.name,
                        status: "error",
                        message: "Something went wrong while checking this file.",
                        issues: []
                    });
                }
            }
        }
    } finally {
        // Always hide global overlay at the end
        if (specCheckOverlay) {
            specCheckOverlay.classList.add("hidden");
        }
    }

    renderResults(allResults);
});

// --------------------------------------
// RENDER RESULTS INLINE PER SECTION
// --------------------------------------

function renderResults(results) {
    if (!results.length) return;

    // Clear previous inline results & hide "File(s) uploaded..."" in all sections
    sections.forEach((s) => {
        const box = s.rootEl.querySelector(".section-results");
        if (box) {
            box.innerHTML = "";
            box.classList.add("hidden");
        }
        if (s.uploadConfirm) {
            s.uploadConfirm.classList.add("hidden");
        }
    });

    // Group results by section (same spec + same file as in that section)
    const sectionMap = new Map();

    results.forEach((r) => {
        const section = sections.find(
            (s) =>
                s.specSelect.value === r.spec &&
                s.files.some((f) => f.name === r.fileName)
        );

        if (!section) return;

        const list = sectionMap.get(section.id) || [];
        list.push(r);
        sectionMap.set(section.id, list);
    });

    // Render results inside each section's box
    sectionMap.forEach((resultList, sectionId) => {
        const section = sections.find((s) => s.id === sectionId);
        if (!section) return;

        const resultsBox = section.rootEl.querySelector(".section-results");
        if (!resultsBox) return;

        let html = "";

        resultList.forEach((r) => {
            if (r.status === "pass") {
                html += `
                    <div class="section-result-item">
                        <h4>✔ ${r.fileName} — Pass</h4>
                        <p>${r.message}</p>
                    </div>
                `;
            } else if (r.status === "fail") {
                const issuesHtml = (r.issues || [])
                    .map(i => `<li>${i}</li>`)
                    .join("");

                html += `
                    <div class="section-result-item">
                        <h4>✖ ${r.fileName} — Fail</h4>
                        <ul>${issuesHtml}</ul>
                    </div>
                `;
            } else {
                html += `
                    <div class="section-result-item">
                        <h4>⚠ ${r.fileName} — Error</h4>
                        <p>${r.message}</p>
                    </div>
                `;
            }
        });

        resultsBox.innerHTML = html;
        resultsBox.classList.remove("hidden");
    });
}

// --------------------------------------
// ADD ANOTHER SIZE
// --------------------------------------

addSizeBtn.addEventListener("click", () => {
    const first = document.querySelector(".spec-section");
    if (!first) return;

    // Deep clone the first section
    const clone = first.cloneNode(true);

    // Clear values/state in clone
    const specSelect    = clone.querySelector(".spec-select");
    const fileInput     = clone.querySelector(".file-input");
    const uploadConfirm = clone.querySelector(".upload-confirm");
    const uploadOverlay = clone.querySelector(".upload-overlay");
    const dropArea      = clone.querySelector(".drop-area");
    const resultsBox    = clone.querySelector(".section-results");

    if (specSelect) specSelect.value = "";
    if (fileInput) fileInput.value = "";
    if (uploadConfirm) uploadConfirm.classList.add("hidden");
    if (uploadOverlay) uploadOverlay.classList.add("hidden");
    if (dropArea) dropArea.classList.remove("drag-over");
    if (resultsBox) {
        resultsBox.innerHTML = "";
        resultsBox.classList.add("hidden");
    }

    sectionsContainer.appendChild(clone);
    initSection(clone);
});

// --------------------------------------
// RESET ALL
// --------------------------------------

resetAllBtn.addEventListener("click", () => {
    // Remove all extra sections, keep first
    const allSections = sectionsContainer.querySelectorAll(".spec-section");
    allSections.forEach((el, idx) => {
        if (idx > 0) el.remove();
    });

    // Reset state array and ID counter
    sections.length = 0;
    nextSectionId = 1;

    // Reset first section UI
    const first = sectionsContainer.querySelector(".spec-section");
    if (first) {
        const specSelect    = first.querySelector(".spec-select");
        const fileInput     = first.querySelector(".file-input");
        const uploadConfirm = first.querySelector(".upload-confirm");
        const uploadOverlay = first.querySelector(".upload-overlay");
        const dropArea      = first.querySelector(".drop-area");
        const resultsBox    = first.querySelector(".section-results");

        if (specSelect) specSelect.value = "";
        if (fileInput) fileInput.value = "";
        if (uploadConfirm) uploadConfirm.classList.add("hidden");
        if (uploadOverlay) uploadOverlay.classList.add("hidden");
        if (dropArea) dropArea.classList.remove("drag-over");
        if (resultsBox) {
            resultsBox.innerHTML = "";
            resultsBox.classList.add("hidden");
        }

        // Rebuild state for first section (no new listeners needed, they already exist)
        const state = {
            id: nextSectionId++,
            rootEl: first,
            specSelect,
            dropArea,
            browseBtn: first.querySelector(".browse-btn"),
            fileInput,
            uploadOverlay,
            uploadConfirm,
            files: []
        };
        sections.push(state);
    }

    // Disable check button again
    checkBtn.classList.add("disabled");
    checkBtn.disabled = true;

    // Scroll back to the top card
    if (first) {
        first.scrollIntoView({ behavior: "smooth" });
    }
});

// --------------------------------------
// BOOTSTRAP
// --------------------------------------

initExistingSections();
