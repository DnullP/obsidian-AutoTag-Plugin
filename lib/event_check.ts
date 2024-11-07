import { textProcesser } from "./text_process"
import { Plugin, TFile, CachedMetadata, MetadataCache } from "obsidian";
import * as path from 'path';
import * as internal from "stream";
import { text } from "stream/consumers";

async function processAllFiles(plugin: Plugin) {
    const files = plugin.app.vault.getMarkdownFiles();
    for (const file of files) {
        const metadata = plugin.app.metadataCache.getFileCache(file);

        if (metadata && metadata.frontmatter) {
            console.log("info: processing")
            updateMainTag(plugin, file)
            console.log("info: finished tagging")
        }
    }

    const resolvedLinks = plugin.app.metadataCache.resolvedLinks
    Object.entries(resolvedLinks).forEach(async function (entries) {
        //quick get mainTag
        let srcPath = entries[0]
        let secondTags = textProcesser.getSecondTag(entries[1])

        let file = plugin.app.vault.getFileByPath(srcPath)
        if (file == undefined) {
            return
        }
        let content = await plugin.app.vault.read(file)
        content = textProcesser.addSecondTags(content, secondTags)
        plugin.app.vault.modify(file, content)
    })
}

async function onFileMoved(plugin: Plugin, file: TFile, oldPath: string) {
    if (file.extension === 'md') {
        console.log(`File moved from ${oldPath} to ${file.path}`);

        if (path.dirname(oldPath) == path.dirname(file.path)) {
            return
        }
        updateMainTag(plugin, file)
        //getBacklinksForFile is a undocumented function
        let backlinks = plugin.app.metadataCache.getBacklinksForFile(file)["data"]
        backlinks.forEach(async (key, filepath) => {
            let file = plugin.app.vault.getFileByPath(filepath)
            if (file == undefined) {
                return
            }
            let content = await plugin.app.vault.read(file)
            content = await textProcesser.removeSecondTags(content)
            let refLinks = plugin.app.metadataCache.resolvedLinks[file.path]
            let secondTags = textProcesser.getSecondTag(refLinks)
            content = await textProcesser.addSecondTags(content, secondTags)
            plugin.app.vault.modify(file, content)
        })
    }
}

async function onMetadataChanged(plugin: Plugin, file: TFile) {
    if (file.extension === 'md') {
        console.log(`Metadata changed in ${file.path}`);
        let metadata = plugin.app.metadataCache.resolvedLinks

        let content = await plugin.app.vault.read(file)
        content = textProcesser.removeSecondTags(content)
        content = await textProcesser.addSecondTags(content, textProcesser.getSecondTag(metadata[file.path]))
        console.log(content)
        await plugin.app.vault.modify(file, content)

        return
    }
}

async function updateMainTag(plugin: Plugin, file: TFile) {
    const content = await plugin.app.vault.read(file);
    let modifiedContent = await textProcesser.deleteTags(content)
    let mainTags = await textProcesser.generateMainTag(file)
    let newModifiedContent = await textProcesser.addFrontMatter(modifiedContent, "tags", `[${mainTags.join(",")}]`)
    plugin.app.vault.modify(file, newModifiedContent)
}

export { processAllFiles, onFileMoved, onMetadataChanged }