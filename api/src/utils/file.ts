import path from "node:path";

export function assertHasExtension(fileName: string): asserts fileName is string {
    if (fileName.trim() === "") {
        throw new Error("File name cannot be empty");
    }
    const extension: string = path.extname(fileName);
    if (extension === "") {
        throw new Error("File lacks an extension");
    }
}

export function splitFilename(fileName: string): { basename: string; extension: string } {
    const extension: string = path.extname(fileName).trim();
    const basename: string = path.basename(fileName, extension).replaceAll(/[^\w\-.]/g, "");

    return { basename, extension };
}