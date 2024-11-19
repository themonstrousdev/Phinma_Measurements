const schoolForm = document.getElementById('addSchoolForm');

schoolForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  // get form data
  const school = document.getElementById('newSchoolInput').value.trim();

  const loadingScreen = document.getElementById('loading-screen');
  loadingScreen.classList.add('show');

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
      setTimeout(() => {
        location.reload();
      }, 1000);
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

  const loadingScreen = document.getElementById('loading-screen');
  loadingScreen.classList.add('show');

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

function finishOrder(school, row) {
  const loadingScreen = document.getElementById('loading-screen');
  loadingScreen.classList.add('show');
  
  fetch('/finishOrder', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({school: school, row: row})
  })
  .then(res => {
    if(res.status == 200) {
      alert('Order finished!');
      location.reload();
    } else if (res.status == 429) {
      alert('Rate limited. Please try again after 3-5 minutes. This is a free Google API account limitation.');
    } else if (res.status == 403) {
      alert('Your login has expired but your token has been renewed. Please refresh your page and try again.');
    } else {
      alert('Error finishing order!');
    }
  });
}