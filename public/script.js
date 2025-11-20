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
    
    let element = document.getElementById("forhidingbutton");
    element.removeAttribute("hidden");

        
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
