import os
import socket

from app import settings


def info():
    return {
        "pod": os.getenv("POD_NAME", socket.gethostname()),
        "node": os.getenv("NODE_NAME", "local"),
        "ip": os.getenv("POD_IP", ""),
        "version": settings.APP_VERSION,
    }
