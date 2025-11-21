// scripts.js — Check My Specs (multi-size, multi-file), improved per-file results

// GLOBAL ELEMENTS
const sectionsContainer = document.getElementById("sections-container");
const addSizeBtn = document.getElementById("addSizeBtn");
const checkBtn = document.getElementById("checkBtn");
const resetAllBtn = document.getElementById("resetAllBtn");
const specCheckOverlay = document.getElementById("specCheckOverlay");

// STATE
let nextSectionId = 1;
// Each entry: { id, rootEl, specSelect, dropArea, browseBtn, fileInput, uploadOverlay, uploadConfirm, resultHolder, files: [] }
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

    const specSelect    = sectionEl.querySelector(".spec-select");
    const dropArea      = sectionEl.querySelector(".drop-area");
    const browseBtn     = sectionEl.querySelector(".browse-btn");
    const fileInput     = sectionEl.querySelector(".file-input");
    const uploadOverlay = sectionEl.querySelector(".upload-overlay");
    const uploadConfirm = sectionEl.querySelector(".upload-confirm");

    // Create result holder DIV inside section
    let resultHolder = sectionEl.querySelector(".section-results");
    if (!resultHolder) {
        resultHolder = document.createElement("div");
        resultHolder.className = "section-results";
        sectionEl.querySelector(".section-inner").appendChild(resultHolder);
    }

    const state = {
        id,
        rootEl: sectionEl,
        specSelect,
        dropArea,
        browseBtn,
        fileInput,
        uploadOverlay,
        uploadConfirm,
        resultHolder,
        files: []
    };
    sections.push(state);

    // Browse click → open file picker
    browseBtn.addEventListener("click", () => fileInput.click());

    // File picker
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

    section.files = files;

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
// CHECK BUTTON
// --------------------------------------

checkBtn.addEventListener("click", async () => {
    if (checkBtn.classList.contains("disabled")) return;

    const activeSections = sections.filter(s => s.files.length > 0);

    if (!activeSections.length) {
        alert("Please upload at least one file.");
        return;
    }

    for (const s of activeSections) {
        if (!s.specSelect.value) {
            alert("Please select a board type + size for each uploaded artwork.");
            s.rootEl.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }
    }

    // Results map per section
    const sectionResults = new Map(); // sectionId → [results]

    specCheckOverlay.classList.remove("hidden");

    try {
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

                    const resultObj = {
                        fileName: file.name,
                        spec: specName,
                        status: data.status,
                        message: data.message || "",
                        issues: data.issues || []
                    };

                    if (!sectionResults.has(s.id)) {
                        sectionResults.set(s.id, []);
                    }
                    sectionResults.get(s.id).push(resultObj);

                } catch {
                    if (!sectionResults.has(s.id)) {
                        sectionResults.set(s.id, []);
                    }
                    sectionResults.get(s.id).push({
                        fileName: file.name,
                        spec: specName,
                        status: "error",
                        message: "Something went wrong while checking this file.",
                        issues: []
                    });
                }
            }
        }
    } finally {
        specCheckOverlay.classList.add("hidden");
    }

    renderSectionResults(sectionResults);
});

// --------------------------------------
// RENDER PER-SECTION RESULTS
// --------------------------------------

function renderSectionResults(sectionResults) {

    // Clear all results first
    sections.forEach(s => {
        s.resultHolder.innerHTML = "";
        s.uploadConfirm.classList.add("hidden");
    });

    for (const [sectionId, results] of sectionResults.entries()) {

        const section = sections.find(s => s.id == sectionId);
        if (!section) continue;

        const holder = section.resultHolder;

        results.forEach(result => {
            const box = document.createElement("div");
            box.className = "result-box";

            if (result.status === "pass") {
                box.innerHTML = `
                    <div class="result-pass">
                        <strong>✔ ${result.fileName} — Pass</strong>
                        <div class="result-message">${result.message}</div>
                    </div>
                `;
            } else if (result.status === "fail") {
                const issues = result.issues.map(i => `<li>${i}</li>`).join("");

                box.innerHTML = `
                    <div class="result-fail">
                        <strong>✖ ${result.fileName} — Fail</strong>
                        <ul>${issues}</ul>
                    </div>
                `;
            } else {
                box.innerHTML = `
                    <div class="result-error">
                        ⚠ ${result.fileName} — ${result.message}
                    </div>
                `;
            }

            holder.appendChild(box);
        });
    }
}

// --------------------------------------
// ADD ANOTHER SIZE
// --------------------------------------

addSizeBtn.addEventListener("click", () => {
    const first = document.querySelector(".spec-section");
    const clone = first.cloneNode(true);

    const specSelect = clone.querySelector(".spec-select");
    if (specSelect) specSelect.value = "";

    const fileInput = clone.querySelector(".file-input");
    if (fileInput) fileInput.value = "";

    const uploadConfirm = clone.querySelector(".upload-confirm");
    if (uploadConfirm) uploadConfirm.classList.add("hidden");

    const uploadOverlay = clone.querySelector(".upload-overlay");
    if (uploadOverlay) uploadOverlay.classList.add("hidden");

    const dropArea = clone.querySelector(".drop-area");
    if (dropArea) dropArea.classList.remove("drag-over");

    // Remove old results
    const oldHolder = clone.querySelector(".section-results");
    if (oldHolder) oldHolder.remove();

    sectionsContainer.appendChild(clone);
    initSection(clone);
});

// --------------------------------------
// RESET ALL
// --------------------------------------

resetAllBtn.addEventListener("click", () => {
    const allSections = sectionsContainer.querySelectorAll(".spec-section");
    allSections.forEach((el, idx) => {
        if (idx > 0) el.remove();
    });

    sections.length = 0;
    nextSectionId = 1;

    const first = sectionsContainer.querySelector(".spec-section");
    if (first) {
        first.querySelector(".spec-select").value = "";
        first.querySelector(".file-input").value = "";
        first.querySelector(".upload-confirm").classList.add("hidden");
        first.querySelector(".upload-overlay").classList.add("hidden");
        first.querySelector(".drop-area").classList.remove("drag-over");

        const holder = first.querySelector(".section-results");
        if (holder) holder.innerHTML = "";
    }

    initExistingSections();
});

// --------------------------------------
// BOOTSTRAP
// --------------------------------------

initExistingSections();
