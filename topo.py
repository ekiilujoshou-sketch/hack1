"""
Module 1 — Service Boot Sequencer (DFS Topological Sort).
Uses adjacency list, state-based cycle detection, and critical failure propagation.
"""

from __future__ import annotations

from collections import defaultdict
from typing import Dict, List, Optional, Set, Tuple

# DFS vertex states (state-based cycle detection)
UNVISITED = 0
VISITING = 1
VISITED = 2


def parse_services_file(path: str) -> Tuple[Dict[str, List[str]], Set[str], List[str]]:
    """
    Parse services.txt into adjacency list and critical service set.
    Format: ServiceName: dep1,dep2
    Lines starting with # CRITICAL: name1,name2 mark critical services.
    """
    graph: Dict[str, List[str]] = defaultdict(list)
    all_services: Set[str] = set()
    critical: Set[str] = set()
    file_order: List[str] = []

    with open(path, "r", encoding="utf-8") as f:
        for raw in f:
            line = raw.strip()
            if not line or line.startswith("#"):
                if line.upper().startswith("# CRITICAL:"):
                    names = line.split(":", 1)[1].strip()
                    for name in names.split(","):
                        n = name.strip()
                        if n:
                            critical.add(n)
                continue

            if ":" not in line:
                continue

            service, _, deps_part = line.partition(":")
            service = service.strip()
            if not service:
                continue

            all_services.add(service)
            if service not in file_order:
                file_order.append(service)
            deps = [d.strip() for d in deps_part.split(",") if d.strip()]
            graph[service] = deps
            for dep in deps:
                all_services.add(dep)
                if dep not in graph:
                    graph[dep] = []

    for svc in all_services:
        if svc not in graph:
            graph[svc] = []

    for svc in all_services:
        if svc not in file_order:
            file_order.append(svc)

    return dict(graph), critical, file_order


def build_forward_graph(graph: Dict[str, List[str]]) -> Dict[str, List[str]]:
    """Build reverse edges: dependency -> dependents (for failure propagation)."""
    forward: Dict[str, List[str]] = defaultdict(list)
    for service, deps in graph.items():
        for dep in deps:
            forward[dep].append(service)
    return dict(forward)


def dfs_cycle_detect(
    node: str,
    graph: Dict[str, List[str]],
    state: Dict[str, int],
    parent: Dict[str, Optional[str]],
) -> Optional[List[str]]:
    """
    DFS with VISITING state to detect cycles.
    Returns the circular path if a cycle exists, else None.
    Complexity: O(V + E) per full graph traversal.
    """
    state[node] = VISITING
    for dep in graph.get(node, []):
        if dep not in state:
            state[dep] = UNVISITED
            parent[dep] = node

        if state[dep] == VISITING:
            # Reconstruct cycle: dep -> ... -> node -> dep
            cycle = [dep]
            current: Optional[str] = node
            while current is not None and current != dep:
                cycle.append(current)
                current = parent.get(current)
            cycle.append(dep)
            cycle.reverse()
            return cycle

        if state[dep] == UNVISITED:
            parent[dep] = node
            found = dfs_cycle_detect(dep, graph, state, parent)
            if found:
                return found

    state[node] = VISITED
    return None


def detect_cycle(graph: Dict[str, List[str]]) -> Optional[List[str]]:
    """Run DFS cycle detection across all components."""
    state: Dict[str, int] = {}
    parent: Dict[str, Optional[str]] = {n: None for n in graph}

    for node in graph:
        if state.get(node, UNVISITED) == UNVISITED:
            state[node] = UNVISITED
            found = dfs_cycle_detect(node, graph, state, parent)
            if found:
                return found
    return None


def dfs_topological_sort(
    node: str,
    graph: Dict[str, List[str]],
    state: Dict[str, int],
    order_stack: List[str],
) -> bool:
    """
    DFS topological sort (Decrease & Conquer).
    Visit dependencies first; push service on stack when finished.
    Returns False if cycle detected during sort.
    """
    state[node] = VISITING
    for dep in graph.get(node, []):
        if state.get(dep, UNVISITED) == UNVISITED:
            if not dfs_topological_sort(dep, graph, state, order_stack):
                return False
        elif state.get(dep) == VISITING:
            return False

    state[node] = VISITED
    order_stack.append(node)
    return True


def topological_sort_boot_order(
    graph: Dict[str, List[str]], visit_order: Optional[List[str]] = None
) -> Optional[List[str]]:
    """
    Compute valid boot order via DFS topological sort.
    Dependencies appear before dependents in the result.
    """
    state: Dict[str, int] = {}
    order_stack: List[str] = []
    nodes = visit_order if visit_order else sorted(graph.keys())

    for node in nodes:
        if node in graph and state.get(node, UNVISITED) == UNVISITED:
            if not dfs_topological_sort(node, graph, state, order_stack):
                return None

    return order_stack


def propagate_critical_failure(
    failed: str,
    forward: Dict[str, List[str]],
) -> Set[str]:
    """
    BFS propagation: if a critical service fails, all transitive dependents are skipped.
    """
    skipped: Set[str] = set()
    queue = list(forward.get(failed, []))
    while queue:
        svc = queue.pop(0)
        if svc in skipped:
            continue
        skipped.add(svc)
        queue.extend(forward.get(svc, []))
    return skipped


def run_boot_sequencer(
    config_path: str = "services.txt",
    simulate_failure: Optional[str] = None,
) -> None:
    """Main entry for Module 1: print boot order, cycle error, or failure propagation."""
    graph, critical, file_order = parse_services_file(config_path)
    forward = build_forward_graph(graph)

    print("================================")
    print("SERVICE BOOT SEQUENCER")
    print("================================")
    print()

    cycle = detect_cycle(graph)
    if cycle:
        print("ERROR:")
        print("Cycle detected:")
        print(" -> ".join(cycle))
        return

    boot_order = topological_sort_boot_order(graph, file_order)
    if boot_order is None:
        print("ERROR:")
        print("Cycle detected during topological sort.")
        return

    print("BOOT ORDER:")
    for i, svc in enumerate(boot_order, start=1):
        print(f"{i}. {svc}")

    if critical:
        print()
        print(f"Critical services: {', '.join(sorted(critical))}")

    if simulate_failure and simulate_failure in critical:
        skipped = propagate_critical_failure(simulate_failure, forward)
        print()
        print("================================")
        print("CRITICAL FAILURE PROPAGATION")
        print("================================")
        print(f"Critical service failed: {simulate_failure}")
        print(f"Skipped (dependent) services ({len(skipped)}):")
        for svc in sorted(skipped):
            print(f"  - {svc} [FAILED/SKIPPED]")
        still_boot = [s for s in boot_order if s != simulate_failure and s not in skipped]
        print()
        print("Adjusted boot order (excluding failed/skipped):")
        for i, svc in enumerate(still_boot, start=1):
            print(f"{i}. {svc}")
