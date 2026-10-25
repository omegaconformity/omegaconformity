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
      ['Registered by', 'OMEGA Testing, Inspection and Technical Services'],
      ['Issue date', record.issueDate],
      ['Applicant', record.applicant],
      ['Product / equipment', record.product],
      ['Model / designation', record.model],
      ['Document status', record.status],
      ['Status note', record.statusNote]
    ];
    const table = createNode('table', undefined, 'record-table');
    for (const [label, value] of data) {
      if (!value) continue;
      const row = document.createElement('tr');
      row.append(createNode('th', label));
      const cell = document.createElement('td');
      if (label === 'Document status') {
        cell.append(createNode('span', value, 'status-pill ' + String(value).toLowerCase().replace(/\s+/g, '-')));
      } else {
        cell.textContent = value;
        if (label === 'Model / designation' || label === 'Status note') cell.classList.add('multiline-value');
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
    const inquiryLink = document.getElementById('verification-inquiry');
    if (inquiryLink) inquiryLink.href = 'contact.html?type=document&number=' + encodeURIComponent(number);
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
        showResult('No matching record found', 'Please check the document number. If the document is still missing, use our document inquiry form and include its reference number.', 'missing');
      } else {
        const status = String(result.record.status || 'Active');
        const message = status === 'Active'
          ? 'An active OMEGA document record matching this reference has been found.'
          : 'A record matching this reference was found in the OMEGA registry. Its current status is ' + status + '. This does not mean the document is approved or active.';
        const state = status === 'Active' ? 'found' : (status === 'Pending Approval' || status === 'Under Review' ? 'pending' : 'error');
        showResult('Document record found', message, state, result.record);
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
