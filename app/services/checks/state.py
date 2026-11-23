RANK = {"up": 0, "degraded": 1, "down": 2}
OFFICIAL = {"none": "up", "minor": "degraded", "maintenance": "degraded", "major": "down", "critical": "down"}


def overall(probe, official):
    states = [probe["state"]]
    if official:
        states.append(OFFICIAL.get(official["indicator"], "up"))
    return max(states, key=RANK.get)
