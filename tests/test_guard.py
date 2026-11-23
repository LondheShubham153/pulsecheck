import asyncio

import pytest

from app.services.checks import guard


def run(url):
    return asyncio.run(guard.validate(url))


@pytest.mark.parametrize(
    "ip",
    ["127.0.0.1", "10.0.0.1", "172.16.5.4", "192.168.1.1", "169.254.169.254", "100.64.0.1", "::1", "fe80::1", "::ffff:127.0.0.1", "0.0.0.0"],
)
def test_non_public_ips_rejected(ip):
    assert not guard.is_public(ip)


@pytest.mark.parametrize("ip", ["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"])
def test_public_ips_allowed(ip):
    assert guard.is_public(ip)


@pytest.mark.parametrize(
    "url",
    [
        "ftp://example.com",
        "file:///etc/passwd",
        "http://user:pass@example.com",
        "http://example.com:22",
        "http://[::1]/",
        "http://127.0.0.1/",
        "http://169.254.169.254/latest/meta-data",
        "http://2130706433/",
        "http://localhost/",
        "http:///nohost",
        "http://example.com:notaport",
        "http://a..b/",
        "http://" + "a" * 70 + ".com/",
    ],
)
def test_blocked_urls(url):
    with pytest.raises(guard.BlockedURL):
        run(url)


def test_url_too_long():
    with pytest.raises(guard.BlockedURL):
        run("https://example.com/" + "a" * 3000)
