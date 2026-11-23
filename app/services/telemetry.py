from prometheus_client import CONTENT_TYPE_LATEST, Counter, generate_latest

CHECKS = Counter("pulsecheck_checks_total", "Checks performed", ["service", "state"])


def render():
    return generate_latest(), CONTENT_TYPE_LATEST
