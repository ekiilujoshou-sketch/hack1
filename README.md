# RosterSync: Intelligent Service Dependency and Network Job Scheduling System

Hackathon project combining **graph algorithms (DAA)** for service boot ordering and **operating-system-style scheduling (OS)** for bandwidth-heavy network jobs.

## Folder Structure

```
RosterSync/
├── main.py           # CLI entry point
├── topo.py           # Module 1 — Service Boot Sequencer
├── scheduler.py      # Module 2 — Bandwidth Job Scheduler
├── services.txt      # Service dependency config (15+ services)
├── jobs.txt          # Bandwidth job definitions
└── README.md         # This file
```

## Requirements

- Python 3.8+

No external packages required (stdlib only).

## Quick Start

From the project directory:

```bash
# Run both modules
python main.py

# Boot sequencer only
python main.py --module boot

# Job scheduler only
python main.py --module scheduler

# Critical failure propagation demo (DNS fails)
python main.py --module boot --fail DNS

# Cycle detection demo
python main.py --module boot --cycle-demo

# Time-of-day priority bonus (Backup at night, Streaming by day)
python main.py --module scheduler --time-of-day
```

## Module 1 — Service Boot Sequencer

### Algorithm

- **Graph**: Adjacency list — each service maps to its dependencies.
- **Topological sort**: DFS (Decrease & Conquer); dependencies finished before pushing service onto order stack.
- **Cycle detection**: Three states per vertex — `UNVISITED`, `VISITING`, `VISITED`. An edge to `VISITING` reveals a cycle; the path is reconstructed for output.
- **Complexity**: O(V + E) for sort and cycle check.

### Config (`services.txt`)

```
ServiceName: dependency1,dependency2
# CRITICAL: DNS, Authentication
```

Empty dependency list means no prerequisites:

```
DNS:
Database: Authentication
```

### Critical Failure Propagation (Bonus)

Services listed after `# CRITICAL:` trigger dependent failure propagation. Use:

```bash
python main.py --module boot --fail DNS
```

All services that depend on DNS (directly or indirectly) are marked **FAILED/SKIPPED**, and an adjusted boot order is printed.

## Module 2 — Bandwidth Job Scheduler

### Algorithm

- **Preemptive priority**: Each time unit, the ready job with the **lowest** effective priority number runs (1 = highest).
- **Ready queue**: Min-heap — O(log n) per push/pop; building the queue each tick is O(n log n) overall for n jobs.
- **Threading**: Each job has a worker thread; the scheduler signals one unit of burst per tick via `threading.Event`.
- **Aging**: After waiting `aging_interval` units, effective priority improves (numeric value decreases) to reduce starvation.
- **Context switches**: Logged when the running job changes.

### Config (`jobs.txt`)

```
JobName priority burst_time [arrival_time]
```

- **Higher priority number** = more important (preempts lower numbers).
- Optional `arrival_time` delays when a job enters the ready queue.

Example:

```
Backup 1 15 0
DNS_Request 7 2 2
```

### Time-of-Day Bonus

With `--time-of-day`:

- **Night (22:00–06:00)**: Backup jobs get higher effective priority.
- **Day**: Streaming jobs get higher effective priority.

## Sample Output

### Boot Sequencer (valid graph)

```
================================
SERVICE BOOT SEQUENCER
================================

BOOT ORDER:
1. DNS
2. DHCP
3. Authentication
...
```

### Cycle Error

```
ERROR:
Cycle detected:
DNS -> Proxy -> Firewall -> DNS
```

### Job Scheduler

```
================================
JOB SCHEDULER
================================

WITHOUT AGING
...
Backup Waiting Time: 31

WITH AGING
...
Backup Waiting Time: 12
```

*(Exact numbers depend on tie-breaking and simulation length; aging consistently reduces low-priority wait.)*

## Design Notes

| Component        | Technique                          |
|-----------------|-------------------------------------|
| Graph storage   | Adjacency list                      |
| Boot order      | DFS topological sort                |
| Cycles          | State-based DFS (VISITING)          |
| Failure spread  | BFS on forward (dependent) edges    |
| Scheduling      | Preemptive priority + min-heap      |
| Starvation fix  | Priority aging while waiting        |
| Concurrency     | `threading` per job + scheduler loop |

## Authors / Hackathon

Built for a 12-hour hackathon scope: readable logs, clear module split, and demonstrable DAA/OS concepts without external dependencies.
