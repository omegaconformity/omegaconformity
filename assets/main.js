(function () {
  const menuButton = document.querySelector('.mobile-toggle');
  const menu = document.querySelector('.nav');
  if (menuButton && menu) {
    menuButton.addEventListener('click', () => {
      const opened = menu.classList.toggle('open');
      menuButton.setAttribute('aria-expanded', opened ? 'true' : 'false');
    });
    menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      menu.classList.remove('open');
      menuButton.setAttribute('aria-expanded', 'false');
    }));
  }

  const form = document.getElementById('verification-form');
  if (!form) return;

  const input = document.getElementById('report-number');
  const output = document.getElementById('verification-result');
  const submit = document.getElementById('verification-submit');
  let requestId = 0;

  function createNode(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = String(text);
    if (className) node.className = className;
    return node;
  }

  function showResult(title, text, state, record) {
    output.className = 'verify-result show ' + state;
    output.replaceChildren();
    const titleElement = createNode('div', undefined, 'result-title');
    titleElement.append(createNode('span', '', 'result-dot'), document.createTextNode(title));
    output.append(titleElement);
    if (text) output.append(createNode('p', text, 'small-note'));
    if (!record) return;

    const data = [
      ['Document number', record.number],
      ['Document type', record.type],
      ['Issued by', 'OMEGA Testing and Inspection Technology Co. Ltd.'],
      ['Issue date', record.issueDate],
      ['Applicant', record.applicant],
      ['Product / equipment', record.product],
      ['Model / designation', record.model],
      ['Document status', record.status]
    ];
    const table = createNode('table', undefined, 'record-table');
    for (const [label, value] of data) {
      if (!value) continue;
      const row = document.createElement('tr');
      row.append(createNode('th', label));
      const cell = document.createElement('td');
      if (label === 'Document status') {
        cell.append(createNode('span', value, 'status-pill ' + String(value).toLowerCase()));
      } else {
        cell.textContent = value;
      }
      row.append(cell);
      table.append(row);
    }
    output.append(table);
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const number = input.value.trim();
    if (!number) return;
    const current = ++requestId;
    submit.disabled = true;
    submit.replaceChildren(createNode('span', '', 'loading-dot'), document.createTextNode('Checking record…'));
    output.className = 'verify-result';

    try {
      const response = await fetch('/api/verification?number=' + encodeURIComponent(number), {
        headers: { Accept: 'application/json' }, credentials: 'omit', cache: 'no-store'
      });
      const result = await response.json();
      if (current !== requestId) return;
      if (!response.ok) throw new Error(result.error || 'Verification is temporarily unavailable.');
      if (!result.found) {
        showResult('No matching record found', 'Please check the document reference and try again. For assistance, contact info@omegaconformity.com.', 'missing');
      } else {
        const status = String(result.record.status || 'Active');
        const message = status === 'Active'
          ? 'An Omega-issued document record matching this reference has been found.'
          : 'An Omega-issued document record was found, but its current status is ' + status + '.';
        showResult('Document record found', message, status === 'Active' ? 'found' : 'error', result.record);
      }
    } catch (error) {
      if (current === requestId) showResult('Verification unavailable', error.message || 'Please try again later.', 'error');
    } finally {
      if (current === requestId) {
        submit.disabled = false;
        submit.textContent = 'Verify document';
      }
    }
  });
})();
