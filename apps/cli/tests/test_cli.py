from click.testing import CliRunner

from jw.cli import main


def test_version() -> None:
    result = CliRunner().invoke(main, ["--version"])
    assert result.exit_code == 0
    assert "jw, version 0.0.1" in result.output
