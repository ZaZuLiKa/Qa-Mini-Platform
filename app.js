const express = require('express');
const path = require('path');
const app = express();
const port = 3000;
const crypto = require('crypto');
// ეს ობიექტი შეინახავს სესიის მონაცემებს (დროებით)
const activeTestSessions = {};

// Middleware - სტატიკური ფაილების სერვერი
app.use(express.static(path.join(__dirname, 'public')));
// Middleware - JSON და ფორმის მონაცემების დამუშავება
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// მარშრუტი საწყისი გვერდისთვის: ის უბრალოდ index.html-ს აჩვენებს public-დან
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// !!! აქ დავამატებთ API ენდპოინტებს შემდეგ ეტაპებზე !!!
// საჭირო მოდულები
const fs = require('fs');
const CHECKLISTS_PATH = path.join(__dirname, 'data', 'checklists.json');

// --- API ენდპოინტი 1: ჩექლისტების მიღება არჩეული ფუნქციონალის მიხედვით ---
app.post('/api/get-checklists', (req, res) => {
  const selectedFeatures = req.body.features; // ეს იქნება მასივი: ['Cart', 'Register']

  if (!selectedFeatures || selectedFeatures.length === 0) {
    return res.status(400).json({ error: 'გთხოვთ, აირჩიოთ მინიმუმ ერთი ფუნქციონალი.' });
  }

  try {
    const checklistsData = JSON.parse(fs.readFileSync(CHECKLISTS_PATH, 'utf8'));
    let combinedChecklists = [];

    // გავაერთიანოთ ჩექლისტები ყველა არჩეული ფუნქციონალისთვის
    for (const feature of selectedFeatures) {
      if (checklistsData[feature]) {
        // თითოეულ ობიექტს ვამატებთ `feature` ველს, რომ ვიცოდეთ, რომელ ფუნქციონალს ეკუთვნის
        const checklistsWithFeature = checklistsData[feature].map(item => ({
            ...item,
            feature: feature
        }));
        combinedChecklists = combinedChecklists.concat(checklistsWithFeature);
      }
    }

    res.json({ success: true, checklists: combinedChecklists });

  } catch (error) {
    console.error("Error reading checklists file:", error);
    res.status(500).json({ error: 'ჩექლისტების მონაცემების წაკითხვის შეცდომა.' });
  }
});
// --- API ენდპოინტი 2: საბოლოო ჩექლისტების შენახვა ---
app.post('/api/save-selection', (req, res) => {
  const { checklists } = req.body;

  if (!checklists || checklists.length === 0) {
    return res.status(400).json({ success: false, error: 'ჩექლისტები ცარიელია.' });
  }

  // შევქმნათ უნიკალური სესიის ID (მარტივი ჰეშით)
  const sessionId = crypto.randomBytes(16).toString('hex'); 

  // მოვამზადოთ ჩექლისტები ტესტირებისთვის: თითოეულს დავუმატოთ სტატუსი
  const initialTestData = checklists.map(item => ({
    ...item,
    status: 'Pending', // საწყისი სტატუსი
    bugId: null         // ბაგ რეპორტის ID
  }));

  // შევინახოთ მონაცემები RAM-ში სესიის ID-ის ქვეშ
  activeTestSessions[sessionId] = initialTestData;

  console.log(`[SESSION] ახალი სესია შეიქმნა ID: ${sessionId} - ${initialTestData.length} ჩექლისტით.`);

  // დავაბრუნოთ სესიის ID, რათა ფრონტენდმა გადაამისამართოს
  res.json({ success: true, sessionId: sessionId });
});
// --- მარშრუტი 3: ტესტირების გვერდი ---
app.get('/test-page/:sessionId', (req, res) => {
    // გადავცემთ ტესტირების გვერდის HTML-ს, სადაც JS გამოიყენებს sessionId-ს
    res.sendFile(path.join(__dirname, 'public', 'test.html'));
});
// --- API ენდპოინტი 4: ტესტ მონაცემების მოტანა სესიის ID-ის მიხედვით ---
app.get('/api/get-test-data/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const testData = activeTestSessions[sessionId];

    if (!testData) {
        return res.status(404).json({ success: false, error: 'ტესტ სესია ვერ მოიძებნა.' });
    }

    res.json({ success: true, testData: testData });
});


// --- API ენდპოინტი 5: სტატუსის განახლება ---
app.post('/api/update-status', (req, res) => {
    const { sessionId, checklistItemId, status, bugId } = req.body;
    const sessionData = activeTestSessions[sessionId];

    if (!sessionData) {
        return res.status(404).json({ success: false, error: 'სესია არ არსებობს.' });
    }

    const itemIndex = sessionData.findIndex(item => item.id === checklistItemId);

    if (itemIndex !== -1) {
        sessionData[itemIndex].status = status;
        sessionData[itemIndex].bugId = bugId || null;
        console.log(`[UPDATE] Session ${sessionId}: Item ${checklistItemId} updated to ${status}. Bug ID: ${bugId}`);
        return res.json({ success: true });
    }

    res.status(404).json({ success: false, error: 'ჩექლისტი ვერ მოიძებნა ამ სესიაში.' });
});
// სერვერის გაშვება
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});