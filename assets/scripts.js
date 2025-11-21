// Check My Specs — Multi-size, Multi-file

// ELEMENTS
const sectionsContainer = document.getElementById("sections-container");
const addSizeBtn = document.getElementById("addSizeBtn");
const checkBtn = document.getElementById("checkBtn");
const resetAllBtn = document.getElementById("resetAllBtn");
const resultContainer = document.getElementById("result-container");
const resultBox = document.getElementById("result");

// STATE
let nextSectionId = 1;
const sections = [];

// Disable check button at start
checkBtn.classList.add("disabled");
checkBtn.disabled = true;

// -------------------------------
// INITIALISE SECTIONS
// -------------------------------

function initExistingSections() {
    document.querySelectorAll(".spec-section")
        .forEach(el => initSection(el));
}

function initSection(sectionEl) {

    const id = nextSectionId++;
    sectionEl.dataset.sectionId = id;

    const specSelect    = sectionEl.querySelector(".spec-select");
    const dropArea      = sectionEl.querySelector(".drop-area");
    const browseBtn     = sectionEl.querySelector(".browse-btn");
    const fileInput     = sectionEl.querySelector(".file-input");
    const uploadOverlay = sectionEl.querySelector(".upload-overlay");
    const uploadConfirm = sectionEl.querySelector(".upload-confirm");

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

    browseBtn.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", e => {
        const files = Array.from(e.target.files || []);
        handleFilesSelected(state, files);
    });

    dropArea.addEventListener("dragover", e => {
        e.preventDefault();
        dropArea.classList.add("drag-over");
    });

    dropArea.addEventListener("dragleave", () => {
        dropArea.classList.remove("drag-over");
    });

    dropArea.addEventListener("drop", e => {
        e.preventDefault();
        dropArea.classList.remove("drag-over");
        const files = Array.from(e.dataTransfer.files || []);
        handleFilesSelected(state, files);
    });
}

function handleFilesSelected(section, files) {
    if (!files.length) return;

    section.files = files;

    section.uploadOverlay.classList.remove("hidden");
    section.uploadConfirm.classList.add("hidden");

    setTimeout(() => {
        section.uploadOverlay.classList.add("hidden");
        section.uploadConfirm.classList.remove("hidden");
    }, 800);

    checkBtn.classList.remove("disabled");
    checkBtn.disabled = false;
}

// -------------------------------
// CHECK ALL FILES
// -------------------------------

checkBtn.addEventListener("click", async () => {
    if (checkBtn.classList.contains("disabled")) return;

    const active = sections.filter(s => s.files.length);

    if (!active.length) {
        alert("Please upload at least one file.");
        return;
    }

    for (const section of active) {
        if (!section.specSelect.value) {
            alert("Please select a board type + size for each artwork.");
            section.rootEl.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }
    }

    const results = [];

    for (const section of active) {
        const spec = section.specSelect.value;

        for (const file of section.files) {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("spec_option", spec);

            try {
                const response = await fetch("/check", {
                    method: "POST",
                    body: fd
                });

                const data = await response.json();

                results.push({
                    fileName: file.name,
                    spec,
                    status: data.status,
                    message: data.message || "",
                    issues: data.issues || []
                });

            } catch {
                results.push({
                    fileName: file.name,
                    spec,
                    status: "error",
                    message: "Something went wrong while checking this file.",
                    issues: []
                });
            }
        }
    }

    renderResults(results);
});

// -------------------------------
// RENDER RESULTS
// -------------------------------

function renderResults(results) {
    let html = "";

    results.forEach((r, i) => {

        if (i > 0) html += `<hr class="result-divider">`;

        if (r.status === "pass") {
            html += `
                <div>
                    <div style="color:#2a7a34; font-weight:700; font-size:18px;">
                        ✅ ${r.fileName} — ${r.message}
                    </div>
                    <div style="color:#542D54; font-size:14px;">
                        Size: ${r.spec}
                    </div>
                </div>
            `;
        }

        else if (r.status === "fail") {
            const issues = r.issues.map(i => `<li>${i}</li>`).join("");

            html += `
                <div>
                    <div style="color:#b00020; font-weight:700; font-size:18px;">
                        ❌ ${r.fileName} — Artwork DOES NOT meet specs
                    </div>
                    <div style="color:#542D54; font-size:14px;">
                        Size: ${r.spec}
                    </div>
                    <ul style="text-align:left; max-width:600px; margin:8px auto;">
                        ${issues}
                    </ul>
                </div>
            `;
        }

        else {
            html += `
                <div style="color:#b00020; font-weight:700; font-size:18px;">
                    ⚠️ ${r.fileName} — ${r.message}
                </div>
            `;
        }
    });

    resultBox.innerHTML = html;
    resultContainer.classList.remove("hidden");
    resultContainer.scrollIntoView({ behavior: "smooth" });
}

// -------------------------------
// ADD ANOTHER SIZE SECTION
// -------------------------------

addSizeBtn.addEventListener("click", () => {

    const first = document.querySelector(".spec-section");
    const clone = first.cloneNode(true);

    clone.querySelector(".spec-select").value = "";
    clone.querySelector(".file-input").value = "";
    clone.querySelector(".upload-confirm").classList.add("hidden");
    clone.querySelector(".upload-overlay").classList.add("hidden");

    sectionsContainer.appendChild(clone);
    initSection(clone);
});

// -------------------------------
// RESET ALL
// -------------------------------

resetAllBtn.addEventListener("click", () => {

    document.querySelectorAll(".spec-section")
        .forEach((el, i) => { if (i > 0) el.remove(); });

    sections.length = 0;
    nextSectionId = 1;

    resultContainer.classList.add("hidden");
    resultBox.innerHTML = "";

    checkBtn.classList.add("disabled");
    checkBtn.disabled = true;

    initExistingSections();
});

initExistingSections();
