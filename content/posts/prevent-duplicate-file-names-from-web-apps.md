+++
date = '2026-07-19T10:07:00-07:00'
draft = false
title = 'Prevent Duplicate File Names When Saving from Web Apps'
description = 'Why browser-based editors may save filename (1), filename (2), and other duplicate files—and how to fix it in Brave.'
tags = ['brave', 'chrome', 'browsers', 'excalidraw', 'file-system-access-api']
categories = ['tools']
toc = false
+++

Web apps such as Excalidraw can save changes back to the same local file through the **File System Access API**. When that capability is unavailable, a browser may treat every save as a new download and create files named `filename (1)`, `filename (2)`, and so on instead of updating the original.

Browser support and settings vary. Google Chrome enables this capability by default, so web apps can request access to update the selected file without requiring a browser flag. Brave adds an extra setup step, while other browsers, including Firefox, may exhibit the same symptom without offering the same workaround.

## Brave

To enable saving back to the same file:

1. Open [`brave://flags`](brave://flags).
2. Search for **File System Access API**.
3. Set the flag to **Enabled**.
4. Relaunch Brave.

Reopen the file in the web app and approve its file-access request when prompted. Future saves should update the selected file rather than create numbered copies.

Browser flags are experimental and can change or disappear between Brave releases. Only grant file access to web apps you trust.
