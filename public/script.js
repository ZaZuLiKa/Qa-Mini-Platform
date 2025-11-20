let currentChecklists = [];
const checklistContainer = document.getElementById('checklists-container');
const editorSection = document.getElementById('checklist-editor');

async function getChecklists() {
    const form = document.getElementById('feature-selection-form');
    const selectedFeatures = Array.from(form.querySelectorAll('input[name="features"]:checked')).map(cb => cb.value);

    if (!selectedFeatures.length) {
        alert('Please select at least one feature.');
        return;
    }

    try {
        const response = await fetch('/api/get-checklists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ features: selectedFeatures }),
        });
        const data = await response.json();
        if (response.ok && data.success) {
            currentChecklists = data.checklists;
            displayChecklists(currentChecklists);
            editorSection.style.display = 'block';
            window.scrollTo(0, document.body.scrollHeight);
        } else alert(data.error || 'Server Error');
    } catch (error) {
        console.error(error);
        alert('Communication error with the server.');
    }
}

function displayChecklists(checklists) {
    document.querySelector('.feature-selection').style.display = 'none';
    checklistContainer.innerHTML = '';
    let currentFeature = null;

    checklists.forEach(item => {
        if (item.feature !== currentFeature) {
            const title = document.createElement('h3');
            title.className = 'feature-title';
            title.textContent = `${item.feature} Feature`;
            checklistContainer.appendChild(title);
            currentFeature = item.feature;
        }

        const itemDiv = document.createElement('div');
        itemDiv.className = 'checklist-item';
        itemDiv.id = `item-${item.id}`;
        
        const textSpan = document.createElement('span');
        textSpan.textContent = `(${item.id}) ${item.text}`;
        itemDiv.appendChild(textSpan);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Remove';
        deleteButton.onclick = () => removeChecklistItem(item.id);
        itemDiv.appendChild(deleteButton);

        checklistContainer.appendChild(itemDiv);
    });
}

function removeChecklistItem(idToRemove) {
    currentChecklists = currentChecklists.filter(item => item.id !== idToRemove);
    const element = document.getElementById(`item-${idToRemove}`);
    if (element) element.remove();
}

async function confirmSelection() {
    if (!currentChecklists.length) { alert('No checklists have been selected.'); return; }

    try {
        const response = await fetch('/api/save-selection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ checklists: currentChecklists }),
        });
        const data = await response.json();
        if (response.ok && data.success) {
            window.location.href = `/test-page/${data.sessionId}`;
        } else alert('Error saving data.');
    } catch (error) {
        console.error(error);
        alert('Communication error.');
    }
}

let currentSessionId = null;
let testData = [];

document.addEventListener('DOMContentLoaded', () => {
    const pathParts = window.location.pathname.split('/');
    currentSessionId = pathParts[pathParts.length - 1];
    document.getElementById('session-id').textContent = currentSessionId;

    if(currentSessionId) fetchTestData();
    else document.getElementById('checklists-test-container').innerHTML = '<p style="color:red;">შეცდომა: სესიის ID ვერ მოიძებნა.</p>';
});

async function fetchTestData() {
    try {
        const response = await fetch(`/api/get-test-data/${currentSessionId}`);
        const data = await response.json();

        if(response.ok && data.success){
            testData = data.testData;
            displayTestChecklists();
        } else alert('Failed to fetch test data.: ' + data.error);
    } catch(error) {
        console.error('Fetch Error:', error);
        alert('Server communication error..');
    }
}

function displayTestChecklists() {
    const container = document.getElementById('checklists-test-container');
    container.innerHTML = '';
    let currentFeature = null;

    testData.forEach(item => {
        if(item.feature !== currentFeature){
            const title = document.createElement('h3');
            title.className = 'feature-title';
            title.textContent = `feature: ${item.feature}`;
            container.appendChild(title);
            currentFeature = item.feature;
        }

        const itemDiv = document.createElement('div');
        itemDiv.className = `checklist-item status-${item.status.toLowerCase()}`;
        itemDiv.id = `test-item-${item.id}`;

        const details = document.createElement('div');
        details.className = 'item-details';
        details.innerHTML = `<span>(${item.id})</span> ${item.text} 
            <small style="color: gray;">[Status: ${item.status}] ${item.bugId ? `(Bug ID: ${item.bugId})` : ''}</small>`;
        itemDiv.appendChild(details);

        const actions = document.createElement('div');
        actions.className = 'actions';

        const passBtn = document.createElement('button');
        passBtn.textContent = 'Pass';
        passBtn.onclick = () => updateTestStatus(item.id,'Pass');

        const failBtn = document.createElement('button');
        failBtn.textContent = 'Failed';
        failBtn.onclick = () => showBugInput(item.id);

        actions.appendChild(passBtn);
        actions.appendChild(failBtn);

        const bugInput = document.createElement('div');
        bugInput.id = `bug-input-${item.id}`;
        bugInput.style.display = 'none';
        bugInput.innerHTML = `<input type="text" placeholder="Bug ID (e.g: BUG-001)" id="bug-id-${item.id}" style="margin-left:10px"/>
            <button onclick="updateTestStatus('${item.id}','Failed',document.getElementById('bug-id-${item.id}').value)">save</button>`;

        actions.appendChild(bugInput);
        itemDiv.appendChild(actions);

        container.appendChild(itemDiv);
    });
}

function showBugInput(id) {
    document.querySelectorAll('[id^="bug-input-"]').forEach(el=>el.style.display='none');
    const bugSection = document.getElementById(`bug-input-${id}`);
    if(bugSection) bugSection.style.display='block';
}

function updateTestStatus(id,status,bugId=null){
    const index = testData.findIndex(item=>item.id===id);
    if(index!==-1){
        testData[index].status=status;
        testData[index].bugId=status==='Failed'? (bugId||'N/A'):null;
        saveTestStatusUpdate(id,status,testData[index].bugId);
        displayTestChecklists();
    }
}

async function saveTestStatusUpdate(checklistItemId,status,bugId){
    try{
        const response = await fetch('/api/update-status',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({ sessionId:currentSessionId, checklistItemId, status, bugId })
        });
        const data = await response.json();
        if(!response.ok || !data.success) alert('Error saving status.');
    }catch(error){console.error('Save status error:',error);}
}

function closeModal(){
    document.getElementById('checklist-modal').style.display='none';
    document.getElementById('modal-overlay').style.display='none';
}

function showChecklistModal(id){
    const item = testData.find(it=>it.id===id);
    if(!item) return;
    const content = `
        <p><strong>Feature:</strong> ${item.feature}</p>
        <p><strong>Checklist ID:</strong> ${item.id}</p>
        <p><strong>Text:</strong> ${item.text}</p>
        <p><strong>Status:</strong> ${item.status}</p>
        <p><strong>Bug ID:</strong> ${item.bugId || '-'}</p>
    `;
    document.getElementById('modal-content').innerHTML = content;
    document.getElementById('checklist-modal').style.display='block';
    document.getElementById('modal-overlay').style.display='block';
}

function generateReport(){
    document.querySelector('#checklists-test-container').style.display='none';
    document.querySelector('#button-GenerateRTMOnC').style.display='none';
    document.querySelector('#filters').style.display='flex';
    let element = document.getElementById("forhidingbutton");
    element.removeAttribute("hidden");
    let element1 =document.getElementById("downloadExcel");
    element1.removeAttribute("hidden");
    let element2=document.getElementById("downloadCSV");
    element2.removeAttribute("hidden");
    let passedCount=0, failedCount=0;
    const totalCount=testData.length;
    let reportRows='';

    testData.forEach(item=>{
        if(item.status==='Pass') passedCount++;
        else if(item.status==='Failed') failedCount++;

        const bugIdDisplay = item.status==='Failed' ? `<a href="${item.bugId}" target="_blank">${item.bugId}</a>` : '-';

        reportRows += `
<tr>
<td><a href="#" onclick="showChecklistModal('${item.id}')">${item.id}</a></td>
<td>${item.feature}</td>
<td>${item.text}</td>
<td class="${item.status==='Failed'?'rtm-bug-id':''}">${bugIdDisplay}</td>
<td class="status-${item.status.toLowerCase()}">${item.status}</td>
</tr>
`;
    });

    const pendingCount = totalCount - passedCount - failedCount;
    const passPercent = totalCount>0 ? ((passedCount/totalCount)*100).toFixed(1):0;
    const failPercent = totalCount>0 ? ((failedCount/totalCount)*100).toFixed(1):0;

    const summaryHTML = `
<p><strong>Report generation time:</strong> ${new Date().toLocaleString()}</p>
<p>
Total: <strong>${totalCount}</strong> |
✅ Pass: <strong>${passedCount}</strong> (${passPercent}%) |
❌ Failed: <strong>${failedCount}</strong> (${failPercent}%) |
⏳ Pending: <strong>${pendingCount}</strong>
</p>
`;

    const reportDiv = document.getElementById('report-output');
    reportDiv.style.display='block';
    reportDiv.innerHTML=`
<h2>Requirement Tracebility Matrix (RTM)</h2>
<div class="summary">${summaryHTML}</div>
<table width="100%" border="1" cellpadding="8" cellspacing="0">
<thead>
<tr>
<th>Checklist ID</th>
<th>Feature</th>
<th>Description</th>
<th>Bug ID</th>
<th>Status</th>
</tr>
</thead>
<tbody>
${reportRows}
</tbody>
</table>
`;
// Populate Feature Filter
const featureDropdown = document.getElementById("featureFilter");
const uniqueFeatures = [...new Set(testData.map(item => item.feature))];

uniqueFeatures.forEach(f => {
    const option = document.createElement("option");
    option.value = f;
    option.textContent = f;
    featureDropdown.appendChild(option);
});

}

// PDF export using jsPDF + autoTable
function downloadReportAsPDF(){
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const headers = [['Checklist ID','Feature','Name','Bug ID','Status']];
    const rows = testData.map(item => [
        item.id,
        item.feature,
        item.text,
        item.status==='Failed'? item.bugId||'-':'-',
        item.status
    ]);

    doc.setFontSize(12);
    doc.text(`QA Report `, 14, 14);
    doc.autoTable({
    startY: 30,
    head: [["Feature", "Checklist ID", "Checklist Text", "Bug ID", "Status"]],
    body: testData.map(item => [
        item.feature,
        item.id,
        item.text,
        item.status === "Failed" ? item.bugId || "-" : "-",
        item.status
    ]),
    styles: { fontSize: 10, cellWidth: 'wrap' }, // <- აქ ხდება ტექსტის გადახრა
    headStyles: { fillColor: [220,220,220] },
    columnStyles: {
        2: { cellWidth: 60 }, // Checklist Text სვეტი გაფართოებულია
        3: { cellWidth: 70 }  // Bug ID სვეტი ვიწროა
    },
    theme: 'grid'
});

    doc.save(`QA_Report_${currentSessionId}.pdf`);
}
document.getElementById('downloadExcel').addEventListener('click', () => {
    if(testData.length === 0){
        alert('No data to export!');
        return;
    }

    // Prepare worksheet data
    const wsData = [
        ["Checklist ID", "Feature", "Description", "Bug ID", "Status"], // headers
        ...testData.map(item => [
            item.id,
            item.feature,
            item.text,
            item.status === "Failed" ? item.bugId || '-' : '-',
            item.status
        ])
    ];

    // Create worksheet & workbook
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Test Report");

    // Save to file
    XLSX.writeFile(wb, `QA_Report_${currentSessionId}.xlsx`);
});
function downloadReportAsCSV() {
    



    if (!testData || testData.length === 0) {
        alert('No data to export.');
        return;
    }

    // CSV headers
    const headers = ['Feature', 'Checklist ID', 'Checklist Text', 'Bug ID', 'Status'];

    // Map data to CSV rows
    const rows = testData.map(item => [
        `"${item.feature}"`,
        `"${item.id}"`,
        `"${item.text}"`,
        `"${item.status === 'Failed' ? item.bugId || '-' : '-'}"`,
        `"${item.status}"`
    ]);

    // Combine headers + rows
    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
        csvContent += row.join(',') + '\n';
    });

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `QA_Report_${currentSessionId}.csv`);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function applyFilters() {
    const statusValue = document.getElementById("statusFilter").value;
    const featureValue = document.getElementById("featureFilter").value;
    const searchValue = document.getElementById("searchFilter").value.toLowerCase();

    const rows = document.querySelectorAll("#report-output table tbody tr");

    rows.forEach(row => {
        const id = row.children[0].innerText.toLowerCase();
        const feature = row.children[1].innerText;
        const text = row.children[2].innerText.toLowerCase();
        const bugId = row.children[3].innerText.toLowerCase();
        const status = row.children[4].innerText;

        let visible = true;

        // Filter by status
        if (statusValue !== "all" && status !== statusValue) visible = false;

        // Filter by feature
        if (featureValue !== "all" && feature !== featureValue) visible = false;

        // Search filter (ID, Text, Bug ID)
        if (
            searchValue &&
            !id.includes(searchValue) &&
            !text.includes(searchValue) &&
            !bugId.includes(searchValue)
        ) {
            visible = false;
        }

        row.style.display = visible ? "" : "none";
    });
}


    
function generateReport(){
    document.querySelector('#checklists-test-container').style.display='none';
    document.querySelector('#button-GenerateRTMOnC').style.display='none';
    document.getElementById("forhidingbutton").removeAttribute("hidden");

    const reportDiv = document.getElementById('report-output');
    reportDiv.style.display='block';

    const totalCount = testData.length;
    const passedCount = testData.filter(item=>item.status==='Pass').length;
    const failedCount = testData.filter(item=>item.status==='Failed').length;
    const pendingCount = totalCount - passedCount - failedCount;

    const summaryHTML = `
        <p><strong>Report generation time:</strong> ${new Date().toLocaleString()}</p>
        <p>
        Total: <strong>${totalCount}</strong> |
        ✅ Pass: <strong>${passedCount}</strong> |
        ❌ Failed: <strong>${failedCount}</strong> |
        ⏳ Pending: <strong>${pendingCount}</strong>
        </p>
    `;

    reportDiv.innerHTML = `
        <h2>Requirement Tracebility Matrix (RTM)</h2>
        <div class="summary">${summaryHTML}</div>
        <table id="rtm-table" width="100%" border="1" cellpadding="8" cellspacing="0">
            <thead>
                <tr>
                    <th onclick="sortByColumn('id')">Checklist ID 🔽</th>
                    <th onclick="sortByColumn('feature')">Feature 🔽</th>
                    <th onclick="sortByColumn('text')">Description 🔽</th>
                    <th onclick="sortByColumn('bugId')">Bug ID 🔽</th>
                    <th onclick="sortByColumn('status')">Status 🔽</th>
                </tr>
            </thead>
            <tbody id="rtm-table-body">
            </tbody>
        </table>
    `;

    renderRTMTable();
}

// ვაგენერიროთ სვეტების მონაცემები tbody-ში
function renderRTMTable(){
    const tbody = document.getElementById('rtm-table-body');
    tbody.innerHTML = '';
    testData.forEach(item=>{
        const bugIdDisplay = item.status==='Failed' ? `<a href="${item.bugId}" target="_blank">${item.bugId}</a>` : '-';
        tbody.innerHTML += `
        <tr>
            <td><a href="#" onclick="showChecklistModal('${item.id}')">${item.id}</a></td>
            <td>${item.feature}</td>
            <td>${item.text}</td>
            <td>${bugIdDisplay}</td>
            <td class="status-${item.status.toLowerCase()}">${item.status}</td>
        </tr>
        `;
    });
}

// სორტირება სვეტის მიხედვით
let currentSort = { column:null, asc:true };

function sortByColumn(column){
    if(currentSort.column === column) currentSort.asc = !currentSort.asc;
    else currentSort = { column, asc:true };

    testData.sort((a,b)=>{
        let valA = a[column] || '';
        let valB = b[column] || '';
        if(column==='status'){
            const order = { 'Pass':1, 'Failed':2, 'Pending':3 };
            valA = order[valA] || 4;
            valB = order[valB] || 4;
        }
        if(valA < valB) return currentSort.asc ? -1 : 1;
        if(valA > valB) return currentSort.asc ? 1 : -1;
        return 0;
    });

    renderRTMTable();
}
