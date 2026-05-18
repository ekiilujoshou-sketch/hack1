document.addEventListener('DOMContentLoaded', () => {
    const bootBtn = document.getElementById('run-boot-btn');
    const failSelect = document.getElementById('fail-select');
    const bootResults = document.getElementById('boot-results');

    const schedulerBtn = document.getElementById('run-scheduler-btn');
    const todCb = document.getElementById('time-of-day-cb');
    const schedulerResults = document.getElementById('scheduler-results');

    bootBtn.addEventListener('click', async () => {
        bootResults.innerHTML = '<div class="empty-state">Processing...</div>';
        try {
            const fail = failSelect.value;
            let url = '/api/boot';
            if (fail) url += `?fail=${fail}`;
            
            const res = await fetch(url);
            const data = await res.json();
            
            if (data.error) {
                bootResults.innerHTML = `<div class="error-text">ERROR: ${data.error}</div>`;
                return;
            }

            let html = '<ul class="boot-list">';
            data.order.forEach((svc, idx) => {
                const isSkipped = data.skipped && data.skipped.includes(svc);
                const cls = isSkipped ? 'skipped' : '';
                const tag = isSkipped ? '<span style="color:#ef4444;font-size:0.8rem;">[SKIPPED]</span>' : '';
                
                html += `<li class="${cls}" style="animation-delay: ${idx * 0.05}s">
                            <span class="num">${idx + 1}</span> 
                            <span>${svc}</span> ${tag}
                         </li>`;
            });
            html += '</ul>';
            bootResults.innerHTML = html;

        } catch (err) {
            bootResults.innerHTML = `<div class="error-text">Error fetching data. Ensure python server is running.</div>`;
        }
    });

    schedulerBtn.addEventListener('click', async () => {
        schedulerResults.innerHTML = '<div class="empty-state">Running Scheduler (Simulation)...</div>';
        try {
            const tod = todCb.checked;
            let url = `/api/scheduler?tod=${tod}`;
            
            const res = await fetch(url);
            const data = await res.json();
            
            if (data.error) {
                schedulerResults.innerHTML = `<div class="error-text">ERROR: ${data.error}</div>`;
                return;
            }

            let html = '<table class="table">';
            html += `<tr>
                        <th>Job</th>
                        <th>No Aging</th>
                        <th>With Aging</th>
                        <th>Delta</th>
                     </tr>`;
            
            data.jobs.forEach(job => {
                const noAging = job.no_aging;
                const withAging = job.with_aging;
                const delta = withAging - noAging;
                const dClass = delta > 0 ? 'delta-positive' : (delta < 0 ? 'delta-negative' : '');
                const dText = delta > 0 ? `+${delta}` : delta;
                
                html += `<tr>
                            <td>${job.name}</td>
                            <td>${noAging}</td>
                            <td>${withAging}</td>
                            <td class="${dClass}">${dText}</td>
                         </tr>`;
            });
            html += '</table>';
            
            schedulerResults.innerHTML = html;

        } catch (err) {
            schedulerResults.innerHTML = `<div class="error-text">Error fetching data.</div>`;
        }
    });
});
