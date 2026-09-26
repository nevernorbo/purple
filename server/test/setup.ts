import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

process.env.PURPLE_DATA_DIR = mkdtempSync(join(tmpdir(), "purple-test-"))
process.env.PURPLE_DB = ":memory:"
process.env.PURPLE_TOKEN = "test-token"
process.env.PURPLE_CLAUDE_BIN = join(import.meta.dir, "fixtures/fake-claude.sh")
