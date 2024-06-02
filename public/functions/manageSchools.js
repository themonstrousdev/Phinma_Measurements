const fs = require('fs').promises;
const path = require('path');
const process = require('process');

const SCHOOLS_PATH = path.join(process.cwd(), '/confidentials/schools.json');

async function getSchools() {
  const content = await fs.readFile(SCHOOLS_PATH);
  return JSON.parse(content);
}

async function editSchools(content) {
  await fs.writeFile(SCHOOLS_PATH, content);
}

async function addSchool(school) {
  let schools = await getSchools();
  schools.push(school);
  schools = JSON.stringify(schools);

  await editSchools(schools);
}

async function deleteSchool(school) {
  let schools = await getSchools();

  if(schools.length == 0) {
    return 204;
  }

  // find school
  const schoolNdx = schools.findIndex(sch => sch == school);

  if(schoolNdx == -1) {
    return 404;
  } else {
    // remove school
    schools = schools.filter(sch => sch != schools[schoolNdx]);
    schools = JSON.stringify(schools);

    await editSchools(schools);
  }
}

exports.getSchools = getSchools;
exports.addSchool = addSchool;
exports.deleteSchool = deleteSchool;