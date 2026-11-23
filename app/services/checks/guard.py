import asyncio
import ipaddress
import socket
from dataclasses import dataclass
from urllib.parse import urlparse

from app import settings


class BlockedURL(ValueError):
    pass


@dataclass
class Target:
    host: str
    host_header: str
    pinned_url: str


def is_public(ip):
    address = ipaddress.ip_address(ip.split("%")[0])
    if address.version == 6 and address.ipv4_mapped:
        address = address.ipv4_mapped
    return address.is_global


async def resolve(host, port):
    loop = asyncio.get_running_loop()
    try:
        infos = await loop.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except (socket.gaierror, UnicodeError):
        raise BlockedURL("Could not resolve host")
    return sorted({info[4][0] for info in infos}, key=lambda ip: ":" in ip)


async def validate(url):
    if len(url) > settings.MAX_URL_LENGTH:
        raise BlockedURL("URL too long")
    try:
        parsed = urlparse(url)
        port = parsed.port
    except ValueError:
        raise BlockedURL("Invalid URL")
    if parsed.scheme not in ("http", "https"):
        raise BlockedURL("Only http and https URLs are allowed")
    if not parsed.hostname or parsed.username or parsed.password:
        raise BlockedURL("Invalid URL")
    port = port or (443 if parsed.scheme == "https" else 80)
    if port not in settings.ALLOWED_PORTS:
        raise BlockedURL("Port not allowed")
    ips = await resolve(parsed.hostname, port)
    if not ips or not all(is_public(ip) for ip in ips):
        raise BlockedURL("Target resolves to a non-public address")
    ip = ips[0]
    netloc = f"[{ip}]" if ":" in ip else ip
    if parsed.port:
        netloc = f"{netloc}:{parsed.port}"
    return Target(
        host=parsed.hostname,
        host_header=parsed.netloc,
        pinned_url=parsed._replace(netloc=netloc).geturl(),
    )
