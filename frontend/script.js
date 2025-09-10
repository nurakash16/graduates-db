let currentPage = 1;
let totalPages = 1;
const pageSize = 10;

async function loadGraduates(page = 1) {
  currentPage = page;

  const dept = document.getElementById('department').value;
  const search = document.getElementById('search').value;
  const registration = document.getElementById('registration').value;
  const minCgpa = document.getElementById('minCgpa').value;
  const maxCgpa = document.getElementById('maxCgpa').value;

  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (registration) params.append('registration', registration);
  if (minCgpa) params.append('minCgpa', minCgpa);
  if (maxCgpa) params.append('maxCgpa', maxCgpa);
  params.append('page', page);
  params.append('limit', pageSize);

  try {
    const res = await fetch(`https://graduates-db.onrender.com/graduates/${dept}?${params}`);
    if (!res.ok) throw new Error('Backend request failed');

    const result = await res.json();
    const data = result.data;
    totalPages = result.totalPages;

    const tbody = document.getElementById('graduatesTable');
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4">No graduates found</td></tr>`;
      document.getElementById('pageInfo').textContent = '';
      return;
    }

    data.forEach(g => {
      const row = `<tr>
        <td class="border px-4 py-2">${g.name}</td>
        <td class="border px-4 py-2">${g.program}</td>
        <td class="border px-4 py-2">${g.cgpa}</td>
        <td class="border px-4 py-2">${g.date_of_graduation}</td>
        <td class="border px-4 py-2">${g.semester}</td>
        <td class="border px-4 py-2">${g.convocation}</td>
        <td class="border px-4 py-2">${g.registration}</td>
      </tr>`;
      tbody.innerHTML += row;
    });

    // Update page info
    document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;

    // Disable buttons if needed
    document.getElementById('prevBtn').disabled = currentPage === 1;
    document.getElementById('nextBtn').disabled = currentPage === totalPages;

  } catch (err) {
    console.error(err);
    const tbody = document.getElementById('graduatesTable');
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-red-500">Error loading data</td></tr>`;
  }
}

function prevPage() {
  if (currentPage > 1) loadGraduates(currentPage - 1);
}
function nextPage() {
  if (currentPage < totalPages) loadGraduates(currentPage + 1);
}
