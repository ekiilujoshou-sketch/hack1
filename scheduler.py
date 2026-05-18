"""
Module 2 — Bandwidth Job Scheduler (Preemptive Priority + Aging).
Uses threading for job simulation and heap for O(n log n) ready-queue operations.
"""

from __future__ import annotations

import heapq
import threading
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional, Tuple


@dataclass(order=True)
class HeapEntry:
    """Heap entry: higher effective_priority wins; min-heap via negated priority."""

    neg_priority: int
    tie_key: tuple
    name: str = field(compare=False)
    effective_priority: int = field(compare=False)
    base_priority: int = field(compare=False)
    burst: int = field(compare=False)
    remaining: int = field(compare=False)
    waiting_start: int = field(compare=False)
    total_wait: int = field(compare=False)


@dataclass
class Job:
    name: str
    priority: int
    burst: int
    remaining: int
    arrival: int = 0
    waiting_start: int = 0
    total_wait: int = 0
    effective_priority: int = 0
    aging_announced: bool = field(default=False, compare=False)

    def __post_init__(self) -> None:
        self.remaining = self.burst
        self.effective_priority = self.priority


def parse_jobs_file(path: str) -> List[Job]:
    """Read jobs.txt: name priority burst_time [arrival_time]."""
    jobs: List[Job] = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split()
            if len(parts) < 3:
                continue
            name, prio, burst = parts[0], int(parts[1]), int(parts[2])
            arrival = int(parts[3]) if len(parts) > 3 else 0
            job = Job(name=name, priority=prio, burst=burst, remaining=burst)
            job.arrival = arrival
            jobs.append(job)
    return jobs


def is_night(hour: Optional[int] = None) -> bool:
    """Night window 22:00–06:00 for time-of-day priority bonus."""
    h = hour if hour is not None else datetime.now().hour
    return h >= 22 or h < 6


def apply_time_of_day_priority(job: Job, hour: Optional[int] = None) -> int:
    """
    Bonus: Backup jobs gain priority at night; Streaming gains priority during day.
    Higher returned value = higher scheduling priority.
    """
    base = job.effective_priority
    night = is_night(hour)
    if night and "backup" in job.name.lower():
        return base + 2
    if not night and "stream" in job.name.lower():
        return base + 2
    return base


def _execute_burst_unit(job: Job) -> None:
    """Thread target: simulates one time unit of bandwidth usage for a job."""
    if job.remaining > 0:
        job.remaining -= 1


def build_ready_heap(
    jobs: List[Job],
    current_time: int,
    use_aging: bool,
    aging_interval: int,
    aging_boost: int,
    hour: Optional[int],
    last_aging_log: List[str],
) -> List[HeapEntry]:
    """
    Build min-heap of ready jobs. O(n log n) when pushing n jobs.
    Apply aging to jobs waiting longer than aging_interval.
    """
    heap: List[HeapEntry] = []
    for job in jobs:
        if job.remaining <= 0:
            continue
        if job.arrival > current_time:
            continue

        eff = job.effective_priority
        if use_aging and current_time - job.waiting_start >= aging_interval:
            if not job.aging_announced:
                job.aging_announced = True
                last_aging_log.append(job.name)
            eff = eff + aging_boost
            job.effective_priority = eff

        eff = apply_time_of_day_priority(job, hour)
        # Tie-break: longer burst first among equal priority (streaming before backup)
        tie_burst = -job.remaining
        heapq.heappush(
            heap,
            HeapEntry(
                neg_priority=-eff,
                tie_key=(job.arrival, tie_burst),
                effective_priority=eff,
                name=job.name,
                base_priority=job.priority,
                burst=job.burst,
                remaining=job.remaining,
                waiting_start=job.waiting_start,
                total_wait=job.total_wait,
            ),
        )
    return heap


def preemptive_priority_schedule(
    jobs: List[Job],
    use_aging: bool = False,
    use_threads: bool = True,
    aging_interval: int = 5,
    aging_boost: int = 1,
    time_of_day: bool = False,
    max_time: int = 200,
) -> Tuple[int, Dict[str, int]]:
    """
    Preemptive priority scheduler with optional aging and threading.
    Returns total simulation time and per-job waiting times.
    """
    job_map = {j.name: j for j in jobs}
    for j in jobs:
        j.remaining = j.burst
        j.total_wait = 0
        j.waiting_start = j.arrival
        j.effective_priority = j.priority
        j.aging_announced = False

    current_time = 0
    running: Optional[str] = None
    last_aging_log: List[str] = []
    hour = datetime.now().hour if time_of_day else 12

    while current_time < max_time:
        unfinished = [j for j in jobs if j.remaining > 0]
        if not unfinished:
            break

        heap = build_ready_heap(
            jobs,
            current_time,
            use_aging,
            aging_interval,
            aging_boost,
            hour if time_of_day else None,
            last_aging_log,
        )

        for name in last_aging_log:
            print(f"Time {current_time} -> Aging Applied to {name}")
        last_aging_log.clear()

        if not heap:
            current_time += 1
            continue

        entry = heapq.heappop(heap)
        selected = job_map[entry.name]

        if running != selected.name:
            if running is not None:
                print(f"Time {current_time} -> Context Switch -> {selected.name}")
            running = selected.name
        print(f"Time {current_time} -> Running {selected.name}")

        # Waiting time for jobs not running
        for job in jobs:
            if job.remaining > 0 and job.name != selected.name and job.arrival <= current_time:
                job.total_wait += 1

        if use_threads:
            worker = threading.Thread(
                target=_execute_burst_unit, args=(selected,), daemon=True
            )
            worker.start()
            worker.join(timeout=0.5)
        else:
            selected.remaining -= 1

        current_time += 1

    wait_times = {j.name: j.total_wait for j in jobs}
    return current_time, wait_times


def run_scheduler(
    config_path: str = "jobs.txt",
    use_time_of_day: bool = False,
) -> None:
    """Run scheduler comparison: without aging vs with aging."""
    jobs = parse_jobs_file(config_path)
    if not jobs:
        print("No jobs found in", config_path)
        return

    print("================================")
    print("JOB SCHEDULER")
    print("================================")
    print()

    if use_time_of_day:
        period = "NIGHT" if is_night() else "DAY"
        print(f"Time-of-day mode: {period} (Backup↑ at night, Streaming↑ by day)")
        print()

    print("WITHOUT AGING")
    print()
    def clone_jobs() -> List[Job]:
        cloned: List[Job] = []
        for j in jobs:
            c = Job(name=j.name, priority=j.priority, burst=j.burst, remaining=j.burst)
            c.arrival = j.arrival
            cloned.append(c)
        return cloned

    _, wait_no_aging = preemptive_priority_schedule(
        clone_jobs(),
        use_aging=False,
        use_threads=True,
        time_of_day=use_time_of_day,
    )
    print()
    backup_wait_before = wait_no_aging.get("Backup", 0)
    print(f"Backup Waiting Time: {backup_wait_before}")
    print()

    print("WITH AGING")
    print("(Higher priority number = more important; aging boosts waiting jobs)")
    print()
    _, wait_aging = preemptive_priority_schedule(
        clone_jobs(),
        use_aging=True,
        use_threads=True,
        aging_interval=5,
        aging_boost=3,
        time_of_day=use_time_of_day,
    )
    print()
    backup_wait_after = wait_aging.get("Backup", 0)
    print(f"Backup Waiting Time: {backup_wait_after}")
    print()

    print("================================")
    print("WAITING TIME COMPARISON")
    print("================================")
    all_names = sorted(set(wait_no_aging) | set(wait_aging))
    print(f"{'Job':<16} {'No Aging':>10} {'With Aging':>12} {'Delta':>8}")
    print("-" * 50)
    for name in all_names:
        before = wait_no_aging.get(name, 0)
        after = wait_aging.get(name, 0)
        delta = after - before
        sign = "+" if delta > 0 else ""
        print(f"{name:<16} {before:>10} {after:>12} {sign}{delta:>7}")
