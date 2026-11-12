from __future__ import annotations

from ipaddress import ip_address, ip_network
from pathlib import Path
import re
from urllib.parse import urlsplit

import pytest
import yaml


REPO_ROOT = Path(__file__).resolve().parents[2]


def _compose(relative_path: str) -> dict:
    return yaml.safe_load((REPO_ROOT / relative_path).read_text(encoding="utf-8"))


def _example_environment() -> dict[str, str]:
    lines = (REPO_ROOT / ".env.production.example").read_text(encoding="utf-8").splitlines()
    return dict(line.split("=", 1) for line in lines if line and not line.startswith("#"))


def _network_value(expression: str, variable: str, environment: dict[str, str]) -> str:
    match = re.fullmatch(r"\$\{([A-Z_]+):-([^}]+)\}", expression)
    assert match is not None, f"{variable} must retain an overridable Compose default"
    assert match.group(1) == variable
    return environment.get(variable, match.group(2))


@pytest.mark.parametrize("use_example_environment", [False, True])
def test_database_fixed_address_cannot_be_allocated_to_another_container(
    use_example_environment: bool,
) -> None:
    production = _compose("docker-compose.production.example.yml")
    db_network = production["services"]["db"].get("networks", {}).get("default", {})
    assert "ipv4_address" in db_network, "The production database needs a persistent private IP"
    default_network = production["networks"].get("default", {})
    assert "ipam" in default_network, "Reserve the DB address outside automatic allocations"
    [pool] = default_network["ipam"]["config"]

    environment = _example_environment() if use_example_environment else {}
    if use_example_environment:
        assert {
            "PRODUCTION_DB_IP",
            "PRODUCTION_DB_SUBNET",
            "PRODUCTION_DB_GATEWAY",
            "PRODUCTION_DB_IP_RANGE",
        } <= environment.keys()

    address = ip_address(_network_value(db_network["ipv4_address"], "PRODUCTION_DB_IP", environment))
    subnet = ip_network(_network_value(pool["subnet"], "PRODUCTION_DB_SUBNET", environment))
    gateway = ip_address(_network_value(pool["gateway"], "PRODUCTION_DB_GATEWAY", environment))
    dynamic_pool = ip_network(_network_value(pool["ip_range"], "PRODUCTION_DB_IP_RANGE", environment))

    assert address == ip_address("172.18.0.2")
    assert subnet == ip_network("172.18.0.0/16")
    assert gateway == ip_address("172.18.0.1")
    assert dynamic_pool == ip_network("172.18.128.0/17")
    assert address in subnet and gateway in subnet
    assert dynamic_pool.subnet_of(subnet)
    assert address not in (subnet.network_address, subnet.broadcast_address, gateway)
    assert address not in dynamic_pool
    assert gateway not in dynamic_pool


def test_database_network_preserves_private_port_and_durable_volume_mounts() -> None:
    production = _compose("docker-compose.production.example.yml")
    services = production["services"]
    base = _compose("docker-compose.yml")

    assert "ports" not in base["services"]["db"]
    assert {
        name: service["ports"] for name, service in services.items() if "ports" in service
    } == {
        "backend": ["127.0.0.1:${BACKEND_BIND_PORT:-8000}:8000"],
        "frontend-web": ["127.0.0.1:${FRONTEND_BIND_PORT:-8080}:8080"],
    }
    database_url = urlsplit(_example_environment()["DATABASE_URL"])
    assert database_url.hostname == "db"
    assert database_url.port == 5432
    assert {name: service["volumes"] for name, service in services.items() if "volumes" in service} == {
        "db": ["production_pgdata:/var/lib/postgresql/data"],
        "backend": ["production_media:/data/media", "production_private_media:/data/private-media"],
        "notification-worker": ["production_media:/data/media", "production_private_media:/data/private-media"],
    }
    assert production["volumes"] == {
        "production_pgdata": None,
        "production_media": {"name": "${PRODUCTION_MEDIA_VOLUME_NAME:-aisw-production_production_media}"},
        "production_private_media": {"name": "${PRODUCTION_PRIVATE_MEDIA_VOLUME_NAME:-aisw-production_production_private_media}"},
    }


def test_database_network_preserves_existing_service_and_ingress_isolation() -> None:
    production = _compose("docker-compose.production.example.yml")
    services = production["services"]
    assert set(services["db"].get("networks", {})) == {"default"}
    for name in ("backend", "frontend-web"):
        assert set(services[name]["networks"]) == {"default", "cloudflare_origin"}
    assert services["notification-worker"].get("networks", ["default"]) == ["default"]
    assert services["cloudflared"]["networks"] == {
        "cloudflare_origin": {"ipv4_address": "${CLOUDFLARE_TUNNEL_IP:-172.30.250.14}"},
        "cloudflare_egress": None,
    }
    assert production["networks"]["cloudflare_origin"] == {
        "internal": True,
        "ipam": {"config": [{"subnet": "${CLOUDFLARE_TUNNEL_SUBNET:-172.30.250.0/28}"}]},
    }
    assert production["networks"]["cloudflare_egress"] is None

    ingress = _compose("docker-compose.ip.yml")
    assert ingress["networks"] == {
        "ip_ingress": {
            "internal": True,
            "ipam": {"config": [{"subnet": "${IP_INGRESS_SUBNET:-172.30.251.0/28}"}]},
        },
        "ip_public": {"driver": "bridge"},
    }
