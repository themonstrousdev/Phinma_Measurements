const schoolForm = document.getElementById('addSchoolForm');

schoolForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  // get form data
  const school = document.getElementById('newSchoolInput').value.trim();

  fetch('/addSchool', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({school: school})
  })
  .then(res => {
    if(res.status == 200) {
      alert('School added!');
      location.reload();
    } else {
      alert('School already exists!');
    }
  });
});

function changeSchool() {
  const school = document.getElementById('schoolSelect').value;
  location.href = `/?school=${school}`;
}

const deleteForm = document.getElementById('deleteSchoolForm');

deleteForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  // get form data
  const school = document.getElementById('deleteSchoolSelect').value;

  fetch('/deleteSchool', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({school: school})
  })
  .then(res => {
    if(res.status == 200) {
      alert('School deleted!');
      location.href = '/';
    } else {
      alert('School does not exist!');
    }
  });
});