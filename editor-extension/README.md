# OutClass — OffCourse learning guide

Keep your preferred editor, terminal, debugger and extensions. Connect the running local OutClass companion to get course-aware progressive guidance beside your code.

1. Open OutClass, start or continue your course, then open its exact project folder in VS Code or VSCodium.
2. In OutClass → Editors & extensions, install this companion and generate an editor connection code.
3. In your editor, run **OutClass: Connect course workspace** and enter the code. Credentials are saved in the editor's SecretStorage.
4. Save and test your attempt, then ask OffCourse from the activity bar or command palette. The guide uses your selected OutClass AI connection.

The Udemy Chrome extension continues tracking your course through the same local companion. One active course session is supported at a time. Connect each course explicitly; another project cannot supply context to this course. The companion runs on localhost port 47831. Remote/SSH/WSL extension hosts are not supported in this preview. The guide cannot edit files or execute commands. Code and course excerpts are sent only for your requested AI help; notebooks require separate explicit sharing in OutClass.

This VSIX is installed locally. It is not a published Microsoft Marketplace listing and does not provide a VS Code extension host inside OutClass's built-in editor.

Use **OutClass: Run saved file and record evidence** for a bounded local run before another hint. It records the saved source, output and exit status in the companion. The first use asks for local execution consent. Use the ordinary editor terminal for long jobs; its arbitrary output is not automatically treated as verified evidence.
