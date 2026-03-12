import * as assert from "node:assert";
import * as vscode from "vscode";

suite("Extension", () => {
  test("activates and registers the newf.create command", async () => {
    const ext = vscode.extensions.getExtension("undefined_publisher.newf");
    assert.ok(ext, "extension should be found");
    await ext.activate();
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes("newf.create"));
  });
});
