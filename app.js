const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const app = express();
const port = 3000;

const activeTestSessions = {};
const CHECKLISTS_PATH = path.join(__dirname,'data','checklists.json');

app.use(express.static(path.join(__dirname,'public')));
app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.get('/', (req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));

// --- API: Get checklists ---
app.post('/api/get-checklists', (req,res)=>{
    const selectedFeatures = req.body.features;
    if(!selectedFeatures||!selectedFeatures.length) return res.status(400).json({error:'Please select at least one functionality.'});
    try{
        const checklistsData = JSON.parse(fs.readFileSync(CHECKLISTS_PATH,'utf8'));
        let combined=[];
        selectedFeatures.forEach(f=>{
            if(checklistsData[f]){
                const arr = checklistsData[f].map(i=>({...i, feature:f}));
                combined=combined.concat(arr);
            }
        });
        res.json({success:true, checklists:combined});
    }catch(e){ console.error(e); res.status(500).json({error:'Error reading checklists.'});}
});

// --- API: Save selection ---
app.post('/api/save-selection', (req,res)=>{
    const {checklists} = req.body;
    if(!checklists||!checklists.length) return res.status(400).json({success:false,error:'Checklists are empty.'});
    const sessionId = crypto.randomBytes(16).toString('hex');
    const initialData = checklists.map(i=>({...i, status:'Pending', bugId:null}));
    activeTestSessions[sessionId]=initialData;
    console.log(`[SESSION] New Session ID:${sessionId}`);
    res.json({success:true, sessionId});
});

// --- Test page ---
app.get('/test-page/:sessionId', (req,res)=>res.sendFile(path.join(__dirname,'public','test.html')));

// --- API: Get test data ---
app.get('/api/get-test-data/:sessionId',(req,res)=>{
    const {sessionId} = req.params;
    const data = activeTestSessions[sessionId];
    if(!data) return res.status(404).json({success:false,error:'Test session not found.'});
    res.json({success:true,testData:data});
});

// --- API: Update status ---
app.post('/api/update-status',(req,res)=>{
    const {sessionId, checklistItemId, status, bugId} = req.body;
    const session = activeTestSessions[sessionId];
    if(!session) return res.status(404).json({success:false,error:'Session does not exist.'});
    const index = session.findIndex(i=>i.id===checklistItemId);
    if(index!==-1){
        session[index].status=status;
        session[index].bugId=bugId||null;
        console.log(`[UPDATE] Session ${sessionId}: Item ${checklistItemId} => ${status}`);
        return res.json({success:true});
    }
    res.status(404).json({success:false,error:'Checklist not found.'});
});

app.listen(port,()=>console.log(`Server running at http://localhost:${port}`));
