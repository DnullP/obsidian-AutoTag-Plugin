import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, Vault } from 'obsidian';

async function processAllFiles(plugin: Plugin) {
    const files = plugin.app.vault.getMarkdownFiles();
    for (const file of files) {
        const metadata = plugin.app.metadataCache.getFileCache(file);

        if (metadata && metadata.frontmatter) {
            console.log("info: processing")
            const content = await plugin.app.vault.read(file);
            let modifiedContent = await deleteTags(content)
            let mainTags = await generateMainTag(file)
            let newModifiedContent = await addFrontMatter(modifiedContent, "tags", `[${mainTags.join(",")}]`)
            plugin.app.vault.modify(file, newModifiedContent)
            console.log("info: finished tagging")
        }
    }

    const resolvedLinks = plugin.app.metadataCache.resolvedLinks
    Object.entries(resolvedLinks).forEach(async function (entries) {
        //quick get mainTag
        let srcPath = entries[0]
        let secondTags = getSecondTag(entries[1])

        let file = plugin.app.vault.getFileByPath(srcPath)
        if (file == undefined) {
            return
        }
        let content = await plugin.app.vault.read(file)
        content = addSecondTags(content, secondTags)
        plugin.app.vault.modify(file, content)
    })
}

function addSecondTags(content: string, secondTags: string[]): string {
    let text = secondTags.map((tag) => "#" + tag).join(" ")
    return content.replace(/^(---\s*\n[^]*?\n---\s*\n)/, `$1${text}\n`)
}

function getSecondTag(refLinks: Record<string, number>): string[] {
    let secondTags: Set<string> = new Set();

    Object.keys(refLinks).forEach((pathToRef) => {
        pathToRef.split("/").slice(0, -1).forEach((tag) => secondTags.add(tag));
    });

    return Array.from(secondTags)
}

async function addFrontMatter(content: string, key: string, value: string): Promise<string> {
    if (content == null) {
        return content
    }

    const frontMatterRegex = /^---\n([\s\S]*?)\n---\n/;

    let newContent: string;

    if (frontMatterRegex.test(content)) {
        // 已有front-matter，直接更新内容
        const existingFrontMatter = content.match(frontMatterRegex)[1];

        const updatedFrontMatter = await updateFrontMatter(existingFrontMatter, key, value);
        newContent = content.replace(frontMatterRegex, `---\n${updatedFrontMatter}\n---\n`);
    } else {
        // 无front-matter，直接添加
        const newFrontMatter = `${key}: ${value}\n`;
        newContent = `---\n${newFrontMatter}---\n\n${content}`;
    }
    return newContent
}

async function updateFrontMatter(frontMatter: string, key: string, value: string): Promise<string> {
    const lines = frontMatter.split('\n');
    let foundKey = false;
    const updatedLines = lines.map(line => {
        if (line.startsWith(`${key}:`)) {
            foundKey = true;
            return `${key}: ${value}`;
        }
        return line;
    });

    if (!foundKey) updatedLines.push(`${key}: ${value}`);
    return updatedLines.join('\n');
}

async function deleteTags(content: string): Promise<string> {
    return content.replace(/#\S+/g, '').replace(/(tags:[^\n]*)(\n\s+-[^\n]*)+/g, '$1')
}

async function generateMainTag(file: TFile): Promise<string[]> {
    let mainTag: string[] | undefined = file.path.split('/').slice(0, -1)
    return mainTag ?? []
}

export { processAllFiles }