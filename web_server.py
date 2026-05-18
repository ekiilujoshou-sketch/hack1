import http.server
import socketserver
import json
import urllib.parse
import os
import sys

# Add parent directory to path so we can import modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from topo import parse_services_file, build_forward_graph, detect_cycle, topological_sort_boot_order, propagate_critical_failure
from scheduler import parse_jobs_file, Job, preemptive_priority_schedule

PORT = 8000
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend')
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))

class APIHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def log_message(self, format, *args):
        # Disable logging for cleaner output
        pass

    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path
        query = urllib.parse.parse_qs(parsed_path.query)

        if path.startswith('/api/'):
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()

            try:
                if path == '/api/boot':
                    response = self.handle_boot(query)
                elif path == '/api/scheduler':
                    response = self.handle_scheduler(query)
                else:
                    response = {"error": "Not found"}
            except Exception as e:
                response = {"error": str(e)}

            self.wfile.write(json.dumps(response).encode('utf-8'))
        else:
            # Fallback to serving static files
            if path == '/':
                self.path = '/index.html'
            return super().do_GET()

    def handle_boot(self, query):
        services_file = os.path.join(ROOT_DIR, 'services.txt')
        graph, critical, file_order = parse_services_file(services_file)
        
        cycle = detect_cycle(graph)
        if cycle:
            return {"error": f"Cycle detected: {' -> '.join(cycle)}"}

        boot_order = topological_sort_boot_order(graph, file_order)
        if boot_order is None:
            return {"error": "Cycle detected during topological sort."}

        fail_svc = query.get('fail', [''])[0]
        skipped = []
        if fail_svc and fail_svc in critical:
            forward = build_forward_graph(graph)
            skipped_set = propagate_critical_failure(fail_svc, forward)
            skipped = list(skipped_set)

        return {
            "order": boot_order,
            "critical": list(critical),
            "skipped": skipped
        }

    def handle_scheduler(self, query):
        jobs_file = os.path.join(ROOT_DIR, 'jobs.txt')
        use_tod = query.get('tod', ['false'])[0].lower() == 'true'

        jobs = parse_jobs_file(jobs_file)
        
        def clone_jobs():
            cloned = []
            for j in jobs:
                c = Job(name=j.name, priority=j.priority, burst=j.burst, remaining=j.burst)
                c.arrival = j.arrival
                cloned.append(c)
            return cloned

        # Mock print to suppress the verbose logging during API call
        original_print = __builtins__.print
        __builtins__.print = lambda *args, **kwargs: None

        try:
            _, wait_no_aging = preemptive_priority_schedule(
                clone_jobs(),
                use_aging=False,
                use_threads=False, # Disable threading for faster synchronous API response
                time_of_day=use_tod,
            )

            _, wait_aging = preemptive_priority_schedule(
                clone_jobs(),
                use_aging=True,
                use_threads=False,
                aging_interval=5,
                aging_boost=3,
                time_of_day=use_tod,
            )
        finally:
            __builtins__.print = original_print

        all_names = sorted(set(wait_no_aging) | set(wait_aging))
        job_stats = []
        for name in all_names:
            job_stats.append({
                "name": name,
                "no_aging": wait_no_aging.get(name, 0),
                "with_aging": wait_aging.get(name, 0)
            })

        return {"jobs": job_stats}

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), APIHandler) as httpd:
        print(f"==================================================")
        print(f"RosterSync API & Frontend running!")
        print(f"Open http://localhost:{PORT} in your web browser.")
        print(f"==================================================")
        print(f"Press Ctrl+C to quit.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")
