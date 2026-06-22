//#region  Variable
const { google } = require("googleapis");
const fs = require('fs');
const path = require('path');
const cron = require("node-cron");
const token = "bdc7984cbd35ef5c13731af2deba70de";

const spreadsheetId =
  "10UYA9NUics7lYqWx2o6QbnEY9b716JKmAD_-iOOQtNQ";

const auth = new google.auth.GoogleAuth({
keyFile: "dashboard-sheet-498503-836075361bd7.json",
scopes: ["https://www.googleapis.com/auth/spreadsheets",
          "https://www.googleapis.com/auth/drive"
        ]
});

const sheets = google.sheets({ version: "v4", auth });



let reportArray = [];
let WorkshopRows = [];
let courseRows = [];
let userObject = {
  sheetname: "Users",
  data: [],
}
let sheetObject = [
  {
    sheetname: "WCI",
    keyword: "Workshop",
    data: [],
  },
  {
    sheetname: "AI-01",
    keyword: "AI Literacy",
    data: [],
  },
  {
    sheetname: "AI-02",
    keyword: "Deep Learning",
    data: [],
  },
  {
    sheetname: "AI-03",
    keyword: "Business Intelligence",
    data: [],
  },
  {
    sheetname: "AI-04",
    keyword: "Immersive Technologies",
    data: [],
  },
  {
    sheetname: "AI-05",
    keyword: "Digital Twin",
    data: [],
  },
  {
    sheetname: "ARC-01",
    keyword: "Industrial Internet of Things",
    data: [],
  },
  {
    sheetname: "ARC-02",
    keyword: "Industrial Data Management",
    data: [],
  },
  {
    sheetname: "FOU-01",
    keyword: "Smart Industry 5.0",
    data: [],
  },
  {
    sheetname: "FOU-02",
    keyword: "Sensors, Actuators",
    data: [],
  },
  {
    sheetname: "FOU-03",
    keyword: "PLC-based Control Systems",
    data: [],
  },
  {
    sheetname: "RPO-01",
    keyword: "Autonomous Mobile Robots",
    data: [],
  },
  {
    sheetname: "RPO-02",
    keyword: "Collaborative Robotics",
    data: [],
  },
  {
    sheetname: "RPO-03",
    keyword: "LEAN Automation",
    data: [],
  },
]
const DELAY = 12 * 60 * 60 * 1000;
//#endregion

RunProcess();
// ---------- RUN ----------
async function main() {
  
  userObject.data.length = 0;
  reportArray.length = 0;
  courseRows.length = 0;
  for(const sheet of sheetObject){
    sheet.data.length = 0;
  }
  GetCourses();
  GetUsers();
  WorkshopRows = await fetchMoodleReport();

  await saveToSheet(WorkshopRows);
 
}

//#region Function
async function RunProcess(){
  console.log("\x1b[32m\x1b[1mSTART GOOGLE DOC AND MOODLE API SYNC\x1b[0m");
  try{
    await main();
    StartCountDown(DELAY);
    setTimeout(RunProcess,DELAY);
  }
  catch(err){
    console.error("\x1b[31m"+err+"\x1b[0m");

    StartCountDown(DELAY);

    setTimeout(RunProcess,DELAY);
  }
}

async function StartCountDown(ms){
  let remaining = Math.floor(ms / 1000);
  const timer = setInterval(() => {
    const min = Math.floor(remaining % 3600 / 60);
    const hour = Math.floor(remaining /3600);
    const sec = remaining % 60;

    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(
        `Next sync in ${hour}hr ${min}m ${sec}s`
    );

    remaining--;

    if (remaining < 0) {
        clearInterval(timer);
        console.log();
    }

  }, 1000);
}

async function fetchMoodleReport() {
  let page = 1;
  const reportId = 22;
  const perpage = 500;
  // ---- get first page (for total rows)
  const firstRes = await fetch(
    `https://mastery-ku.com/webservice/rest/server.php` +
      `?wstoken=${token}` +
      `&wsfunction=core_reportbuilder_retrieve_report` +
      `&moodlewsrestformat=json` +
      `&reportid=${reportId}` +
      `&page=${page}` +
      `&perpage=${perpage}`
  );

  const firstData = await firstRes.json();
  const totalPages = Math.ceil(
    firstData.data.totalrowcount / perpage
  );

  console.log("Total pages:", totalPages);

  // ---- loop all pages
  for (let p = 0; p <= totalPages; p++) {
    console.log("Fetching page:", p);

    const res = await fetch(
      `https://mastery-ku.com/webservice/rest/server.php` +
        `?wstoken=${token}` +
        `&wsfunction=core_reportbuilder_retrieve_report` +
        `&moodlewsrestformat=json` +
        `&reportid=${reportId}` +
        `&page=${p}` +
        `&perpage=${perpage}`
    );

    const data = await res.json();
    reportArray.push(...data.data.rows);
  }

  // ---- process data
  for (const row of reportArray) {
    if(!row.columns[2]?.includes("Admin") || !row.columns[2]?.includes("Teacher")){
      const userFullname = row.columns[0];
      const courseName = row.columns[1];
      const progress = row.columns[5];
      const completed = row.columns[4];
      const email = row.columns[10];
      const cohortName = row.columns[11];
      const status = row.columns[12];
      const temp = String(progress).includes("100") ? "=TRUE" : "=FALSE";
      
      for(const sheet of sheetObject){
        if (row.columns[1]?.includes(`${sheet.keyword}`)) {
          if(sheet.data.some(row => row[0] === userFullname)){
            continue;
          }
          
          sheet.data.push([
              userFullname,
              courseName,
              progress,
              temp,
              new Date(),
              email,
              cohortName,
              status
          ]);
        }
      }
      
    }
        
  }
  clearSheet();
  return WorkshopRows;
}

async function GetCourses(){
  const courseArray = [];
  const perpage = 10;
   const res = await fetch(
      `https://mastery-ku.com/webservice/rest/server.php` +
        `?wstoken=${token}` +
        `&wsfunction=core_reportbuilder_retrieve_report` +
        `&moodlewsrestformat=json` +
        `&reportid=37` +
        `&page=0` +
        `&perpage=20`
    );
    const data = await res.json();
    
    const totalPages =  Math.ceil(data.data.totalrowcount / perpage);
    courseArray.push(...data.data.rows);
    for(const row of courseArray){
      courseRows.push([row.columns[0],
      row.columns[1],
      row.columns[2]
      ])
    }
    return courseRows;
}

async function GetUsers(){
  const column = [];
  const perpage = 50;
  const res = await fetch(
      `https://mastery-ku.com/webservice/rest/server.php` +
        `?wstoken=${token}` +
        `&wsfunction=core_reportbuilder_retrieve_report` +
        `&moodlewsrestformat=json` +
        `&reportid=27` +
        `&page=0` +
        `&perpage=20`
  );
  const data = await res.json();
  const totalPages = Math.ceil(data.data.totalrowcount / perpage);
  userObject.data.push(data.data.headers)
  for (let p = 0; p <= totalPages; p++) {
    const tempArray = [];
    const res = await fetch(
      `https://mastery-ku.com/webservice/rest/server.php` +
        `?wstoken=${token}` +
        `&wsfunction=core_reportbuilder_retrieve_report` +
        `&moodlewsrestformat=json` +
        `&reportid=27` +
        `&page=${p}` +
        `&perpage=${perpage}`
    );
    const data = await res.json();
    tempArray.push(...data.data.rows);
    
    for(const temp of tempArray){
      const data = [];
      for(const t of temp.columns){
        data.push(t);
      }
      userObject.data.push(data);
    }
  }
}

// ---------- SAVE TO GOOGLE SHEET ----------
async function saveToSheet(WorkshopRows) {
  await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${userObject.sheetname}!B5`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
        values: userObject.data
        }
  });

  for(const sheet of sheetObject){
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheet.sheetname}!A3`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
        values: sheet.data
        }
    });
  }

    
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `courses!A2:E`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
        values: courseRows
        }
    });
    

    console.log("================= Saved To Sheet Completed =================");
    

    
}

async function clearSheet() {
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${userObject.sheetname}!B5:K`
    });
  for(const sheet of sheetObject){
    await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${sheet.sheetname}!A3:H`
    });
  }
  console.log("Sheet cleared");
}

function getNextRun() {
    const now = new Date();

    const next = new Date(now);
    next.setSeconds(0);
    next.setMilliseconds(0);

    const minute = now.getMinutes();
    const nextMinute = Math.ceil((minute + 1) / 20) * 20;

    if (nextMinute >= 60) {
        next.setHours(next.getHours() + 1);
        next.setMinutes(0);
    } else {
        next.setMinutes(nextMinute);
    }

    return next;
}





//#endregion