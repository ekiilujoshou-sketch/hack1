document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const saveConfigBtn = document.getElementById('save-config-btn');
    const servicesConfigTa = document.getElementById('services-config-ta');
    const jobsConfigTa = document.getElementById('jobs-config-ta');
    const btnTabEdit = document.getElementById('btn-tab-edit');
    const btnTabView = document.getElementById('btn-tab-view');
    const tabContentEdit = document.getElementById('tab-content-edit');
    const tabContentView = document.getElementById('tab-content-view');
    const servicesPreviewTableContainer = document.getElementById('services-preview-table-container');
    const jobsPreviewTableContainer = document.getElementById('jobs-preview-table-container');

    // Tab toggling logic
    btnTabEdit.addEventListener('click', () => {
        btnTabEdit.classList.add('active-tab');
        btnTabEdit.style.background = '#ffffff';
        btnTabEdit.style.borderColor = 'rgba(15,23,42,0.1)';
        btnTabEdit.style.color = 'var(--text-main)';

        btnTabView.classList.remove('active-tab');
        btnTabView.style.background = 'transparent';
        btnTabView.style.borderColor = 'rgba(15,23,42,0.05)';
        btnTabView.style.color = 'var(--text-muted)';

        tabContentEdit.style.display = 'grid';
        tabContentView.style.display = 'none';
    });

    btnTabView.addEventListener('click', () => {
        btnTabView.classList.add('active-tab');
        btnTabView.style.background = '#ffffff';
        btnTabView.style.borderColor = 'rgba(15,23,42,0.1)';
        btnTabView.style.color = 'var(--text-main)';

        btnTabEdit.classList.remove('active-tab');
        btnTabEdit.style.background = 'transparent';
        btnTabEdit.style.borderColor = 'rgba(15,23,42,0.05)';
        btnTabEdit.style.color = 'var(--text-muted)';

        tabContentEdit.style.display = 'none';
        tabContentView.style.display = 'grid';

        // Render preview tables
        renderPreviewTables();
    });

    function renderPreviewTables() {
        // 1. Services
        const svcText = servicesConfigTa.value;
        const svcLines = svcText.split('\n');
        let svcHtml = '<table class="table" style="margin: 0; font-size: 0.85rem; width: 100%; border-collapse: collapse;">';
        svcHtml += '<tr><th style="padding: 0.6rem; text-align: left;">Service Name</th><th style="padding: 0.6rem; text-align: left;">Dependencies</th></tr>';
        
        let hasSvcs = false;
        svcLines.forEach(line => {
            line = line.trim();
            if (!line || line.startsWith('#')) return;
            const parts = line.split(':');
            const name = parts[0].trim();
            const deps = parts[1] ? parts[1].split(',').map(d => d.trim()).filter(Boolean).join(', ') : 'None';
            svcHtml += `<tr style="border-bottom: 1px solid rgba(15, 23, 42, 0.05);"><td style="padding: 0.6rem; font-weight: 600;">${name}</td><td style="padding: 0.6rem; color: var(--text-muted);">${deps}</td></tr>`;
            hasSvcs = true;
        });
        if (!hasSvcs) svcHtml += '<tr><td colspan="2" style="text-align: center; color: var(--text-muted); padding: 1rem;">No services found</td></tr>';
        svcHtml += '</table>';
        servicesPreviewTableContainer.innerHTML = svcHtml;

        // 2. Jobs
        const jobsText = jobsConfigTa.value;
        const jobsLines = jobsText.split('\n');
        let jobsHtml = '<table class="table" style="margin: 0; font-size: 0.85rem; width: 100%; border-collapse: collapse;">';
        jobsHtml += '<tr><th style="padding: 0.6rem; text-align: left;">Job Name</th><th style="padding: 0.6rem; text-align: center;">Priority</th><th style="padding: 0.6rem; text-align: center;">Burst Time</th><th style="padding: 0.6rem; text-align: center;">Arrival</th></tr>';
        
        let hasJobs = false;
        jobsLines.forEach(line => {
            line = line.trim();
            if (!line || line.startsWith('#')) return;
            const parts = line.split(/\s+/);
            if (parts.length < 3) return;
            const name = parts[0];
            const priority = parts[1];
            const burst = parts[2];
            const arrival = parts[3] ? parts[3] : '0';
            jobsHtml += `<tr style="border-bottom: 1px solid rgba(15, 23, 42, 0.05);">
                <td style="padding: 0.6rem; font-weight: 600;">${name}</td>
                <td style="padding: 0.6rem; text-align: center;">${priority}</td>
                <td style="padding: 0.6rem; text-align: center;">${burst}</td>
                <td style="padding: 0.6rem; text-align: center;">${arrival}</td>
            </tr>`;
            hasJobs = true;
        });
        if (!hasJobs) jobsHtml += '<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1rem;">No jobs found</td></tr>';
        jobsHtml += '</table>';
        jobsPreviewTableContainer.innerHTML = jobsHtml;
    }

    const bootBtn = document.getElementById('run-boot-btn');
    const failSelect = document.getElementById('fail-select');
    const bootResults = document.getElementById('boot-results');
    const dfsPlayBtn = document.getElementById('dfs-play-btn');
    const dfsStepBtn = document.getElementById('dfs-step-btn');
    const dfsGraphContainer = document.getElementById('dfs-graph-container');

    const schedulerBtn = document.getElementById('run-scheduler-btn');
    const todCb = document.getElementById('time-of-day-cb');
    const schedulerResults = document.getElementById('scheduler-results');
    const vizModeSelect = document.getElementById('viz-mode-select');
    const schedPlayBtn = document.getElementById('sched-play-btn');
    const schedStepBtn = document.getElementById('sched-step-btn');
    const heapContainer = document.getElementById('heap-container');
    const timelineContainer = document.getElementById('timeline-container');

    // ==========================================
    // CONFIGURATION FILE LOADER & SAVER
    // ==========================================
    async function loadConfig() {
        try {
            const res = await fetch('/api/config');
            const data = await res.json();
            if (data.services) servicesConfigTa.value = data.services;
            if (data.jobs) jobsConfigTa.value = data.jobs;
        } catch (err) {
            console.error('Error loading config:', err);
        }
    }

    saveConfigBtn.addEventListener('click', async () => {
        const originalText = saveConfigBtn.textContent;
        saveConfigBtn.textContent = 'Saving...';
        saveConfigBtn.disabled = true;

        try {
            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    services: servicesConfigTa.value,
                    jobs: jobsConfigTa.value
                })
            });
            const data = await res.json();
            if (data.status === 'success') {
                saveConfigBtn.textContent = 'Saved!';
                setTimeout(() => {
                    saveConfigBtn.textContent = originalText;
                    saveConfigBtn.disabled = false;
                }, 1000);
                
                // Auto trigger Sequencer and Scheduler calculations
                bootBtn.click();
                schedulerBtn.click();
            } else {
                alert('Error saving: ' + (data.error || 'Unknown error'));
                saveConfigBtn.textContent = originalText;
                saveConfigBtn.disabled = false;
            }
        } catch (err) {
            alert('Failed to save config: ' + err.message);
            saveConfigBtn.textContent = originalText;
            saveConfigBtn.disabled = false;
        }
    });

    // Load configurations on initialization
    loadConfig();

    // Global States for Animations
    let dfsData = null;
    let dfsNetwork = null;
    let dfsNodesDataset = null;
    let dfsEdgesDataset = null;
    let dfsCurrentStep = 0;
    let dfsIntervalId = null;

    let schedData = null;
    let schedCurrentStep = 0;
    let schedMaxTime = 0;
    let schedIntervalId = null;
    let uniqueJobs = [];

    // Colors
    const COLORS = {
        unvisited: '#f1f5f9',
        visiting: '#3b82f6',
        visited: '#2563eb',
        edgeNormal: '#cbd5e1',
        edgeActive: '#3b82f6',
        edgeVisited: '#94a3b8'
    };

    // ==========================================
    // 1. DFS TOPOLOGICAL SORT VISUALIZATION
    // ==========================================
    bootBtn.addEventListener('click', async () => {
        bootResults.innerHTML = '<div class="empty-state">Processing...</div>';
        
        // Reset DFS state
        if (dfsIntervalId) clearInterval(dfsIntervalId);
        dfsPlayBtn.textContent = 'Play';
        dfsPlayBtn.disabled = true;
        dfsStepBtn.disabled = true;
        dfsCurrentStep = 0;
        
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

            // Setup DFS Graph
            if (data.dfs_events && data.graph) {
                dfsData = data;
                if (typeof vis !== 'undefined') {
                    initDFSGraph(data.graph);
                    dfsPlayBtn.disabled = false;
                    dfsStepBtn.disabled = false;
                } else {
                    dfsGraphContainer.innerHTML = '<div class="empty-state" style="color: var(--danger); font-size: 0.9rem; padding: 1rem; text-align: center;">Graph visualization library (vis.js) failed to load. Graph representation is disabled, but the boot sequence executed successfully.</div>';
                }
            }

        } catch (err) {
            bootResults.innerHTML = `<div class="error-text">Error fetching data. Ensure python server is running.</div>`;
        }
    });

    function initDFSGraph(graph) {
        // Prepare vis.js nodes and edges
        const nodes = [];
        const edges = [];
        const seenEdges = new Set();

        const failSvc = failSelect.value;
        const skippedSvcs = (dfsData && dfsData.skipped) ? dfsData.skipped : [];

        Object.keys(graph).forEach(node => {
            let bgColor = COLORS.unvisited;
            let borderColor = '#cbd5e1';
            let labelSuffix = '';
            let fontColor = '#0f172a'; // Dark slate for light background nodes
            
            if (node === failSvc) {
                bgColor = '#ef4444'; // Bright Red for failed node
                borderColor = '#ef4444';
                labelSuffix = ' [FAIL]';
                fontColor = '#ffffff';
            } else if (skippedSvcs.includes(node)) {
                bgColor = '#7f1d1d'; // Dark Red for skipped node
                borderColor = '#7f1d1d';
                labelSuffix = ' [SKIP]';
                fontColor = '#ffffff';
            }

            nodes.push({
                id: node,
                label: node + labelSuffix,
                color: {
                    background: bgColor,
                    border: borderColor,
                    highlight: { background: bgColor, border: '#2563eb' }
                },
                font: { color: fontColor, face: 'Outfit' },
                borderWidth: 1
            });

            graph[node].forEach(dep => {
                const edgeId = `${node}->${dep}`;
                if (!seenEdges.has(edgeId)) {
                    edges.push({
                        id: edgeId,
                        from: node,
                        to: dep,
                        arrows: 'to',
                        color: { color: COLORS.edgeNormal }
                    });
                    seenEdges.add(edgeId);
                }
            });
        });

        dfsNodesDataset = new vis.DataSet(nodes);
        dfsEdgesDataset = new vis.DataSet(edges);

        const containerData = {
            nodes: dfsNodesDataset,
            edges: dfsEdgesDataset
        };

        const options = {
            physics: {
                barnesHut: {
                    gravitationalConstant: -2000,
                    centralGravity: 0.3,
                    springLength: 95
                }
            },
            interaction: { hover: true }
        };

        dfsNetwork = new vis.Network(dfsGraphContainer, containerData, options);
    }

    function stepDFS() {
        if (!dfsData || !dfsData.dfs_events) return;
        const events = dfsData.dfs_events;
        
        if (dfsCurrentStep >= events.length) {
            // Reset to beginning
            dfsCurrentStep = 0;
            resetDFSNodes();
        }

        const failSvc = failSelect.value;
        const skippedSvcs = (dfsData && dfsData.skipped) ? dfsData.skipped : [];
        const event = events[dfsCurrentStep];

        if (event.type === 'visiting') {
            if (event.node === failSvc || skippedSvcs.includes(event.node)) {
                dfsNodesDataset.update({
                    id: event.node,
                    color: { background: '#b91c1c', border: '#b91c1c' },
                    font: { color: '#ffffff' }
                });
            } else {
                dfsNodesDataset.update({
                    id: event.node,
                    color: { background: COLORS.visiting, border: COLORS.visiting },
                    font: { color: '#ffffff' }
                });
            }
        } else if (event.type === 'visited') {
            if (event.node === failSvc) {
                dfsNodesDataset.update({
                    id: event.node,
                    color: { background: '#ef4444', border: '#ef4444' },
                    font: { color: '#ffffff' }
                });
            } else if (skippedSvcs.includes(event.node)) {
                dfsNodesDataset.update({
                    id: event.node,
                    color: { background: '#7f1d1d', border: '#7f1d1d' },
                    font: { color: '#ffffff' }
                });
            } else {
                dfsNodesDataset.update({
                    id: event.node,
                    color: { background: COLORS.visited, border: COLORS.visited },
                    font: { color: '#ffffff' }
                });
            }
        } else if (event.type === 'edge') {
            const edgeId = `${event.from}->${event.to}`;
            dfsEdgesDataset.update({
                id: edgeId,
                color: { color: COLORS.edgeActive },
                width: 3
            });
            // Fade edge back slightly after brief period
            setTimeout(() => {
                dfsEdgesDataset.update({
                    id: edgeId,
                    color: { color: COLORS.edgeVisited },
                    width: 1
                });
            }, 500);
        }

        dfsCurrentStep++;
        
        if (dfsCurrentStep >= events.length) {
            if (dfsIntervalId) {
                clearInterval(dfsIntervalId);
                dfsIntervalId = null;
                dfsPlayBtn.textContent = 'Play';
            }
        }
    }

    function resetDFSNodes() {
        if (!dfsNodesDataset) return;
        const failSvc = failSelect.value;
        const skippedSvcs = (dfsData && dfsData.skipped) ? dfsData.skipped : [];

        dfsNodesDataset.forEach(node => {
            let bgColor = COLORS.unvisited;
            let borderColor = '#cbd5e1';
            let fontColor = '#0f172a';
            
            if (node.id === failSvc) {
                bgColor = '#ef4444';
                borderColor = '#ef4444';
                fontColor = '#ffffff';
            } else if (skippedSvcs.includes(node.id)) {
                bgColor = '#7f1d1d';
                borderColor = '#7f1d1d';
                fontColor = '#ffffff';
            }

            dfsNodesDataset.update({
                id: node.id,
                color: { background: bgColor, border: borderColor },
                font: { color: fontColor }
            });
        });
        dfsEdgesDataset.forEach(edge => {
            dfsEdgesDataset.update({
                id: edge.id,
                color: { color: COLORS.edgeNormal }
            });
        });
    }

    dfsStepBtn.addEventListener('click', () => {
        if (dfsIntervalId) {
            clearInterval(dfsIntervalId);
            dfsIntervalId = null;
            dfsPlayBtn.textContent = 'Play';
        }
        stepDFS();
    });

    dfsPlayBtn.addEventListener('click', () => {
        if (dfsIntervalId) {
            clearInterval(dfsIntervalId);
            dfsIntervalId = null;
            dfsPlayBtn.textContent = 'Play';
        } else {
            dfsPlayBtn.textContent = 'Pause';
            dfsIntervalId = setInterval(stepDFS, 800);
        }
    });


    // ==========================================
    // 2. PROCESS AND MIN-HEAP VISUALIZATION
    // ==========================================
    schedulerBtn.addEventListener('click', async () => {
        schedulerResults.innerHTML = '<div class="empty-state">Running Scheduler (Simulation)...</div>';
        
        // Reset Scheduler state
        if (schedIntervalId) clearInterval(schedIntervalId);
        schedPlayBtn.textContent = 'Play';
        schedPlayBtn.disabled = true;
        schedStepBtn.disabled = true;
        schedCurrentStep = 0;
        
        try {
            const tod = todCb.checked;
            let url = `/api/scheduler?tod=${tod}`;
            
            const res = await fetch(url);
            const data = await res.json();
            
            if (data.error) {
                schedulerResults.innerHTML = `<div class="error-text">ERROR: ${data.error}</div>`;
                return;
            }

            // Render stats table
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

            // Save state for visualization
            schedData = data;
            schedPlayBtn.disabled = false;
            schedStepBtn.disabled = false;
            
            renderStaticTimeline();
            updateSchedulerVisuals();

        } catch (err) {
            schedulerResults.innerHTML = `<div class="error-text">Error fetching data.</div>`;
        }
    });

    vizModeSelect.addEventListener('change', () => {
        if (schedIntervalId) {
            clearInterval(schedIntervalId);
            schedIntervalId = null;
            schedPlayBtn.textContent = 'Play';
        }
        schedCurrentStep = 0;
        renderStaticTimeline();
        updateSchedulerVisuals();
    });

    function getSelectedEvents() {
        if (!schedData) return [];
        return vizModeSelect.value === 'aging' ? schedData.events_aging : schedData.events_no_aging;
    }

    function renderStaticTimeline() {
        const events = getSelectedEvents();
        if (!events || events.length === 0) return;

        // Get max time step
        schedMaxTime = Math.max(...events.map(e => e.time));
        
        // Find unique job names
        uniqueJobs = [...new Set(events.filter(e => e.job).map(e => e.job))];

        let html = '<div class="timeline-grid">';
        
        uniqueJobs.forEach(job => {
            html += `<div class="timeline-row-label">${job}</div>`;
            html += `<div class="timeline-cells" id="cells-${job.replace(/\s+/g, '-')}">`;
            
            for (let t = 0; t <= schedMaxTime; t++) {
                html += `<div class="timeline-cell" data-time="${t}" id="cell-${job.replace(/\s+/g, '-')}-${t}">-</div>`;
            }
            html += '</div>';
        });

        // Add timeline axis
        html += '<div class="time-axis">';
        for (let t = 0; t <= schedMaxTime; t++) {
            html += `<div class="time-tick">${t}</div>`;
        }
        html += '</div>';
        html += '</div>';

        timelineContainer.innerHTML = html;

        // Populate static timeline cells
        events.forEach(e => {
            if (!e.job) return;
            const cleanJob = e.job.replace(/\s+/g, '-');
            const cell = document.getElementById(`cell-${cleanJob}-${e.time}`);
            if (cell) {
                if (e.type === 'run') {
                    if (e.tod_bonus) {
                        cell.className = 'timeline-cell running tod-bonus';
                        cell.textContent = e.remaining + '⭐';
                        cell.title = 'Active Time-of-Day Priority Bonus!';
                    } else {
                        cell.className = 'timeline-cell running';
                        cell.textContent = e.remaining;
                    }
                } else if (e.type === 'aging') {
                    cell.className = 'timeline-cell aging-boost';
                    cell.textContent = 'A';
                } else if (e.type === 'switch') {
                    cell.className = 'timeline-cell context-switch';
                    cell.textContent = 'S';
                }
            }
        });
    }

    function updateSchedulerVisuals() {
        const events = getSelectedEvents();
        if (!events || events.length === 0) return;

        // 1. Highlight current step in the Timeline
        document.querySelectorAll('.timeline-cell').forEach(c => {
            c.classList.remove('active-step');
        });
        
        uniqueJobs.forEach(job => {
            const cleanJob = job.replace(/\s+/g, '-');
            const cell = document.getElementById(`cell-${cleanJob}-${schedCurrentStep}`);
            if (cell) cell.classList.add('active-step');
        });

        // 2. Render Heap Tree at this time step
        // Find the heap state event for the current time step
        const heapEvent = events.find(e => e.time === schedCurrentStep && e.type === 'heap');
        if (heapEvent && heapEvent.state) {
            heapContainer.innerHTML = renderHeapTree(heapEvent.state);
        } else {
            heapContainer.innerHTML = '<div class="empty-state">Ready queue is empty</div>';
        }
    }

    function renderHeapTree(heapArray) {
        if (!heapArray || heapArray.length === 0) {
            return '<div class="empty-state">Queue empty</div>';
        }

        let html = '';
        // Group indices by tree levels: 0 (root), 1-2 (level 1), 3-6 (level 2)
        const levels = [
            [0],
            [1, 2],
            [3, 4, 5, 6]
        ];

        levels.forEach(levelIndices => {
            let levelHtml = '';
            levelIndices.forEach(idx => {
                if (idx < heapArray.length) {
                    const item = heapArray[idx];
                    const isRoot = idx === 0;
                    const cls = isRoot ? 'heap-node active-root' : 'heap-node';
                    levelHtml += `
                        <div class="${cls}">
                            <span class="node-name">${item.name}</span>
                            <span class="node-prio">Prio: ${item.priority}</span>
                            <span class="node-prio">Rem: ${item.remaining}s</span>
                        </div>
                    `;
                }
            });
            if (levelHtml) {
                html += `<div class="heap-level">${levelHtml}</div>`;
            }
        });

        return html;
    }

    function stepScheduler() {
        if (!schedData) return;
        const events = getSelectedEvents();
        if (!events || events.length === 0) return;

        schedCurrentStep++;
        if (schedCurrentStep > schedMaxTime) {
            schedCurrentStep = 0;
        }

        updateSchedulerVisuals();

        if (schedCurrentStep === schedMaxTime) {
            if (schedIntervalId) {
                clearInterval(schedIntervalId);
                schedIntervalId = null;
                schedPlayBtn.textContent = 'Play';
            }
        }
    }

    schedStepBtn.addEventListener('click', () => {
        if (schedIntervalId) {
            clearInterval(schedIntervalId);
            schedIntervalId = null;
            schedPlayBtn.textContent = 'Play';
        }
        stepScheduler();
    });

    schedPlayBtn.addEventListener('click', () => {
        if (schedIntervalId) {
            clearInterval(schedIntervalId);
            schedIntervalId = null;
            schedPlayBtn.textContent = 'Play';
        } else {
            schedPlayBtn.textContent = 'Pause';
            schedIntervalId = setInterval(stepScheduler, 1000);
        }
    });
});
