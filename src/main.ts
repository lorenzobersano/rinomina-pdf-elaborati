import { app, BrowserWindow, dialog, ipcMain } from "electron";
import path from "path";
import started from "electron-squirrel-startup";
import { readdir, readFile, mkdir, copyFile, rm } from "fs/promises";

import * as XLSX from "xlsx";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

function capitalizeFirstLetter(string: string) {
  const splittedText = string.split(" ");

  const transformedSplitted = splittedText.map((string) =>
    string.includes(".")
      ? string.toUpperCase()
      : string.charAt(0).toUpperCase() + string.slice(1).toLowerCase()
  );

  return transformedSplitted.join(" ");
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 600,
    height: 400,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  async function getXlsxContent(
    xlsxPath: string,
    basePath: string,
    pdfFolderFilePaths: string[]
  ) {
    const content = await readFile(xlsxPath);
    const parsedContent = XLSX.read(content, { type: "buffer" });

    const parsedElencoElaborati = Object.fromEntries(
      XLSX.utils
        .sheet_to_json<{
          __EMPTY_24: string;
          __EMPTY_26: string;
        }>(parsedContent.Sheets["ELENCO_ELABORATI"])
        .slice(6)
        .filter((elem) => elem.__EMPTY_24)
        .map((elem) => {
          return [
            elem.__EMPTY_24, // nConsegna
            elem.__EMPTY_26, // Titolo
          ];
        })
        .filter(([nConsegna, Titolo]) => /^[A-Z]-\d*\.\d*$/.test(nConsegna))
        .map(([nConsegna, Titolo]) => {
          return [
            nConsegna,
            capitalizeFirstLetter(Titolo.trim().replaceAll("\n", " ")),
          ];
        })
    );

    console.log(parsedElencoElaborati);

    const parsedExportCsv: { oldName: string; newName: string }[] = [];

    await Promise.all(
      pdfFolderFilePaths.map(async (pdfFolderFilePath) => {
        const pdfsInFolder = await readdir(`${basePath}/${pdfFolderFilePath}`);

        for (const pdfInFolder of pdfsInFolder) {
          const [codProgetto, codConsegna] = pdfInFolder.split("_");

          if (parsedElencoElaborati[codConsegna]) {
            const oldName = pdfInFolder;
            const newName = `${codProgetto}_${codConsegna}_${parsedElencoElaborati[codConsegna]}`;

            parsedExportCsv.push({
              oldName: oldName.replaceAll(".pdf", ""),
              newName,
            });
          }
        }
      })
    );

    return parsedExportCsv.filter((elem) => typeof elem !== "undefined");
  }

  ipcMain.on("select-dirs", async (event, arg) => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ["openDirectory"],
      });

      const [basePath] = result.filePaths;

      const res = await readdir(basePath);
      const xlsxFilePath = res.find((elem) => elem.endsWith(".xlsx"));
      const pdfFolderFilePaths = res.filter((elem) =>
        elem.toUpperCase().trim().endsWith("PDF")
      );
      const newFolderName = "01_Consegna esterna";

      const oldToNew = await getXlsxContent(
        `${basePath}/${xlsxFilePath}`,
        basePath,
        pdfFolderFilePaths
      );

      for (const pdfFolderFilePath of pdfFolderFilePaths) {
        try {
          await rm(`${basePath}/${pdfFolderFilePath}/${newFolderName}`, {
            recursive: true,
            force: true,
          });
        } catch (err) {
          console.log("Still to create");
        }

        await mkdir(`${basePath}/${pdfFolderFilePath}/${newFolderName}`);

        for (const { oldName, newName } of oldToNew) {
          try {
            await copyFile(
              `${basePath}/${pdfFolderFilePath}/${oldName}.pdf`,
              `${basePath}/${pdfFolderFilePath}/${newFolderName}/${newName}.pdf`
            );
          } catch (err) {
            console.log(
              `${basePath}/${pdfFolderFilePath}/${oldName}.pdf non trovato`
            );
          }
        }
      }

      mainWindow.webContents.send("select-dirs-res", "OK");
    } catch (err) {
      mainWindow.webContents.send("select-dirs-res", "KO");
    }
  });

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
