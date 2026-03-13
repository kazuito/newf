import * as assert from "node:assert";
import * as vscode from "vscode";

suite("Extension", () => {
  test("declares activation events for both commands", () => {
    const ext = vscode.extensions.getExtension("kazuito.newf");
    assert.ok(ext, "extension should be found");

    const activationEvents = ext.packageJSON.activationEvents as string[];
    assert.ok(activationEvents.includes("onCommand:newf.newFile"));
    assert.ok(activationEvents.includes("onCommand:newf.newFileAtRoot"));
  });

  test("activates and registers the newf.newFile command", async () => {
    const ext = vscode.extensions.getExtension("kazuito.newf");
    assert.ok(ext, "extension should be found");
    await ext.activate();
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes("newf.newFile"));
  });

  test("registers the newf.newFileAtRoot command", async () => {
    const ext = vscode.extensions.getExtension("kazuito.newf");
    assert.ok(ext, "extension should be found");
    await ext.activate();
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes("newf.newFileAtRoot"));
  });
});
