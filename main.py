#!/usr/bin/env python3
"""
RosterSync: Intelligent Service Dependency and Network Job Scheduling System.
Hackathon entry — Module 1 (DAA) + Module 2 (OS).
"""

import argparse
import sys

from scheduler import run_scheduler
from topo import run_boot_sequencer


def main() -> int:
    """Parse CLI and run selected module(s)."""
    parser = argparse.ArgumentParser(
        description="RosterSync — Boot Sequencer & Bandwidth Job Scheduler"
    )
    parser.add_argument(
        "--module",
        choices=["boot", "scheduler", "all"],
        default="all",
        help="Run boot sequencer, job scheduler, or both (default: all)",
    )
    parser.add_argument(
        "--services",
        default="services.txt",
        help="Path to services dependency config",
    )
    parser.add_argument(
        "--jobs",
        default="jobs.txt",
        help="Path to bandwidth jobs config",
    )
    parser.add_argument(
        "--fail",
        metavar="SERVICE",
        default=None,
        help="Simulate critical failure of SERVICE (propagation demo)",
    )
    parser.add_argument(
        "--time-of-day",
        action="store_true",
        help="Enable time-of-day priority adjustments (bonus)",
    )
    parser.add_argument(
        "--cycle-demo",
        action="store_true",
        help="Demonstrate cycle detection with a temporary cyclic config",
    )
    args = parser.parse_args()

    if args.module in ("boot", "all"):
        if args.cycle_demo:
            _run_cycle_demo()
        else:
            run_boot_sequencer(args.services, simulate_failure=args.fail)
        if args.module == "all":
            print("\n")

    if args.module in ("scheduler", "all"):
        run_scheduler(args.jobs, use_time_of_day=args.time_of_day)

    return 0


def _run_cycle_demo() -> None:
    """Write a cyclic services snippet and run sequencer to show cycle path."""
    import os
    import tempfile

    cyclic = """DNS: Firewall
Firewall: DNS
"""
    path = os.path.join(tempfile.gettempdir(), "rostersync_cycle_demo.txt")
    with open(path, "w", encoding="utf-8") as f:
        f.write(cyclic)
    print("(Cycle demo using temporary config)\n")
    run_boot_sequencer(path)


if __name__ == "__main__":
    sys.exit(main())
