import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, Vault } from 'obsidian';

async function processAllFiles(plugin: Plugin) {
    const files = plugin.app.vault.getMarkdownFiles();
    for (const file of files) {
        const metadata = plugin.app.metadataCache.getFileCache(file);

        if (metadata && metadata.frontmatter) {
            console.log("info: processing")
            const content = await plugin.app.vault.read(file);
            let modifiedContent = await deleteTags(content)

            plugin.app.vault.modify(file, modifiedContent)
            console.log("info: finished tagging")
        }
    }
}

async function deleteTags(content: string): Promise<string> {
    return content.replace(/#\S+/g, '')
}

async function generateMainTag(file: TFile): Promise<string> {
    return file.path.split('/')[-1]
}

export { processAllFiles }