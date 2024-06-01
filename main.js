const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

const router = express.Router();
const jsonParser = bodyParser.json();
const urlEncodedParser = bodyParser.urlencoded({extended: false});

const path = require('path');
const getData = require('./sheet').getData;
const getSchools = require('./public/functions/manageSchools').getSchools;
const addSchool = require('./public/functions/manageSchools').addSchool;
const deleteSchool = require('./public/functions/manageSchools').deleteSchool;

app.use(express.static(path.join(__dirname, '/public')))
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use(router);

const measurements = {
  top: [
    ['SH', 'SH'],
    ['Bust Point', 'Bust Point'],
    ['Figure', 'Figure'],
    ['Bust', 'Bust'],
    ['Waist', 'Waist'],
    ['Hips', 'Hips (Top)'],
    ['AH', 'Arm Hole'],
    ['SL', 'Sleeve Length'],
    ['SC', 'Sleeve Circumference'],
    ['Blouse Length', 'BL'],
    ['Other Remarks', 'Other Remarks (Top)'],
    ['Strand', 'Strand']
  ],
  pants: [
    ['Waistline', 'Waistline (Pants)'],
    ['Hips', 'Hips (Pants)'],
    ['Thigh', 'Thigh'],
    ['Crotch', 'Crotch'],
    ['Knee', 'Knee'],
    ['Pants Length', 'PL'],
    ['Flair', 'Flair'],
    ['Other Remarks', 'Other Remarks (Pants)'],
  ],
  skirt: [
    ['Waistline', 'Waistline (Skirt)'],
    ['Hips', 'Hips (Skirt)'],
    ['Length', 'Length'],
    ['Other Remarks', 'Other Remarks (Skirt)']
  ]
}

// PAGES
router.get('/', async (req, res)=> {
  let schools = await getSchools();
  let currentSchool = null;
  let data = null;
  let headers = null;
  let page = 1;
  let date = null;
  let totalPages = 1;
  let pages = [];
  let searchValue = null;
  if(schools.length > 0) {
    if(req.query.school) {
      currentSchool = req.query.school;
    } else {
      currentSchool = schools[0];
    }

    if(req.query.page) {
      page = req.query.page;
    }

    if(req.query.date) {
      date = req.query.date;
    }

    if(req.query.search) {
      searchValue = req.query.search;
    }

    let sheetData = await getData(currentSchool, page, date, searchValue);

    headers = sheetData.headers;
    // get headers from 1 - 9
    headers = headers.slice(1, 10);
    data = sheetData.data;
    totalPages = sheetData.totalPages;

    // create pages array from totalPages
    for(let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }

    // get middle 5 pages
    if(page > 3) {
      if(page + 2 <= totalPages) {
        pages = pages.slice(page - 3, page + 2);
      } else {
        pages = pages.slice(totalPages - 5, totalPages);
      }
    } else {
      pages = pages.slice(0, 5);
    }
  }
  res.render('index', {schools: schools, currentSchool: currentSchool, data: data, headers: headers, measurements: measurements, page: page, totalPages: totalPages, pages, date: date, wordSearch: searchValue });
})

router.post('/addSchool', jsonParser, async (req, res) => {
  const school = req.body.school.trim();
  let schools = await getSchools();
  if(schools.includes(school)) {
    res.status(400).send('School already exists!');
  } else {
    await addSchool(school);
    res.status(200).send('School added!');
  }
});

router.post('/deleteSchool', jsonParser, async (req, res) => {
  const school = req.body.school.trim();
  let schools = await getSchools();
  if(schools.includes(school)) {
    await deleteSchool(school);
    res.status(200).send('School deleted!');
  } else {
    res.status(400).send('School does not exist!');
  }
});

app.listen(PORT, err => {
  if(!err) {
    console.log(`Server running on ${PORT}.\n\tView Site: https://localhost:3000`);
  } else {
    console.log(`Server can't start.\nERROR: ${err}`)
  }
});