import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, Vault } from 'obsidian';

class TextProcesser {
    constructor() { }
    addSecondTags(content: string, secondTags: string[]): string {
        let text = secondTags.map((tag) => "#" + tag).join(" ")
        return content.replace(/^(---\s*\n[^]*?\n---\s*\n)/, `$1${text}\n`)
    }

    getSecondTag(refLinks: Record<string, number>): string[] {
        let secondTags: Set<string> = new Set();

        Object.keys(refLinks).forEach((pathToRef) => {
            pathToRef.replace(" ", "-").split("/").slice(0, -1).forEach((tag) => secondTags.add(tag));
        });

        return Array.from(secondTags)
    }

    removeSecondTags(content: string): string {
        return content.replace(/(?<=---\n)\s*(?:#[^#\s]+[\s]*)+\n?/g, '');
    }

    async addFrontMatter(content: string, key: string, value: string): Promise<string> {
        if (content == null) {
            return content
        }

        const frontMatterRegex = /^---\n([\s\S]*?)\n---\n?/;

        let newContent: string;

        if (frontMatterRegex.test(content)) {
            // 已有front-matter，直接更新内容
            // @ts-ignore
            const existingFrontMatter = content.match(frontMatterRegex)[1];

            const updatedFrontMatter = await this.updateFrontMatter(existingFrontMatter, key, value);
            newContent = content.replace(frontMatterRegex, `---\n${updatedFrontMatter}\n---\n`);
        } else {
            // 无front-matter，直接添加
            const newFrontMatter = `${key}: ${value}\n`;
            newContent = `---\n${newFrontMatter}---\n\n${content}`;
        }
        return newContent
    }

    async updateFrontMatter(frontMatter: string, key: string, value: string): Promise<string> {
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

    async deleteTags(content: string): Promise<string> {
        return content.replace(/(tags:[^\n]*)(\n\s+-[^\n]*)+/g, '$1')
    }

    async generateMainTag(file: TFile): Promise<string[]> {
        let mainTag: string[] | undefined = file.path.replace(" ", "-").split('/').slice(0, -1)
        return mainTag ?? []
    }
}

let textProcesser = new TextProcesser()

export { textProcesser }