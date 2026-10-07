from unittest.mock import Mock

import pytest
import requests

from mneme import MnemeClient


def client():
    c = MnemeClient(api_key="test-key", vault_id="id/with space", base_url="http://localhost/v1/")
    c.session = Mock()
    return c


def response(data):
    r = Mock()
    r.json.return_value = {"success": True, "data": data}
    return r


def test_write_url_payload_and_timeout():
    c = client()
    c.session.post.return_value = response({"memory": {"id": "one"}})
    assert c.write("hello", hint_type="working", tags=["x"]) == {"memory": {"id": "one"}}
    c.session.post.assert_called_once_with(
        "http://localhost/v1/vaults/id%2Fwith%20space/memories",
        json={"content": "hello", "importance": 0.5, "hint_type": "working", "tags": ["x"]},
        timeout=30.0,
    )


def test_recall_mapping():
    c = client()
    c.session.post.return_value = response(
        {
            "memories": [{"id": "m", "content": "Pune", "type": "semantic", "tokenCount": 2}],
            "totalTokensUsed": 2,
            "filteredCount": 3,
        }
    )
    result = c.recall("home", budget_tokens=200, task_scope="travel")
    assert result.memories[0].content == "Pune"
    assert result.budgetTokens == 200
    assert result.filteredCount == 3
    assert c.session.post.call_args.kwargs["json"] == {
        "query": "home",
        "budget_tokens": 200,
        "task_scope": "travel",
    }


@pytest.mark.parametrize("body", [{"success": False}, {"success": True, "data": []}, []])
def test_invalid_envelope(body):
    c = client()
    c.session.post.return_value.json.return_value = body
    with pytest.raises(ValueError):
        c.write("x")


def test_non_json_and_http_error():
    c = client()
    c.session.post.return_value.json.side_effect = ValueError("bad JSON")
    with pytest.raises(ValueError, match="non-JSON"):
        c.write("x")
    c.session.post.return_value.raise_for_status.side_effect = requests.HTTPError("503")
    with pytest.raises(requests.HTTPError):
        c.recall("x")


def test_timeout_and_close():
    c = client()
    c.session.post.side_effect = requests.Timeout()
    with pytest.raises(requests.Timeout):
        c.recall("x")
    c.close()
    c.session.close.assert_called_once()


def test_environment_config(monkeypatch):
    monkeypatch.setenv("MNEME_API_KEY", "env-key")
    monkeypatch.setenv("MNEME_VAULT_ID", "env-vault")
    c = MnemeClient()
    assert c.vault_id == "env-vault"
    assert c.base_url == "http://localhost:3001/v1"
    assert c.session.headers["Authorization"] == "Bearer env-key"
    c.close()
    with pytest.raises(ValueError, match="positive"):
        MnemeClient(timeout=0)


def test_real_http_round_trip():
    import json
    from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
    from threading import Thread

    received = []

    class Handler(BaseHTTPRequestHandler):
        def do_POST(self):
            payload = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
            received.append((self.path, self.headers["Authorization"], payload))
            data = {"memory": {"id": "written"}}
            if self.path.endswith("/recall"):
                data = {
                    "memories": [
                        {"id": "m", "content": "Pune", "type": "semantic", "tokenCount": 2}
                    ],
                    "totalTokensUsed": 2,
                    "budgetTokens": payload["budget_tokens"],
                    "filteredCount": 0,
                }
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "data": data}).encode())

        def log_message(self, *args):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = Thread(target=server.serve_forever)
    thread.start()
    c = MnemeClient("test-key", "vault", base_url=f"http://127.0.0.1:{server.server_port}/v1")
    try:
        assert c.write("Pune")["memory"]["id"] == "written"
        assert c.recall("home", 100).memories[0].content == "Pune"
        assert received[0][1] == "Bearer test-key"
        assert received[1][0] == "/v1/vaults/vault/memories/recall"
    finally:
        c.close()
        server.shutdown()
        thread.join()
        server.server_close()
