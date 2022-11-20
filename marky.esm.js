// deno-fmt-ignore-file
// deno-lint-ignore-file
// This code was bundled using `deno bundle` and it's not recommended to edit it manually

function stitchCodeBlocks(blocks) {
    const capturedBlocks = [];
    const codeBlockIndexes = [];
    blocks.forEach((block, index)=>{
        if (block.trim().startsWith("```") && !block.trim().endsWith("```")) {
            let capturingBlock = block;
            let nextIndex = index + 1;
            codeBlockIndexes.push(...[
                index,
                nextIndex
            ]);
            while(typeof blocks[nextIndex] !== "undefined" && !blocks[nextIndex].trim().endsWith("```")){
                if (!codeBlockIndexes.length) {
                    capturingBlock += blocks[nextIndex];
                } else {
                    capturingBlock += "\n\n" + blocks[nextIndex];
                }
                nextIndex += 1;
                codeBlockIndexes.push(nextIndex);
            }
            capturingBlock += "\n\n" + blocks[nextIndex];
            capturedBlocks.push(capturingBlock);
        } else if (!codeBlockIndexes.includes(index)) {
            capturedBlocks.push(block);
        }
    });
    return capturedBlocks;
}
function bold(block) {
    const matches = block.match(/\*\*.*?\*\*/g);
    if (matches) {
        for (const match of matches){
            const value = match.substring(2, match.length - 2);
            const replacement = `<strong>${value}</strong>`;
            block = block.replace(match, replacement);
        }
    }
    return block;
}
function createBlocks(content, parsers) {
    let blocks = content.split(/\n\n/);
    blocks = stitchCodeBlocks(blocks);
    return blocks.map((block)=>{
        const match = parsers.find((parser)=>parser.matcher && parser.matcher(block));
        if (match) {
            for (const renderer of match.renderers){
                block = renderer(block);
            }
            return block;
        }
        const parsersWithoutMatcher = parsers.filter((parser)=>!parser.matcher);
        for (const parser of parsersWithoutMatcher){
            for (const renderer1 of parser.renderers){
                block = renderer1(block);
            }
        }
        return block;
    }).join("");
}
function marky(contentOrParsers) {
    if (typeof contentOrParsers === 'string') {
        return createBlocks(contentOrParsers, defaultParsers);
    } else {
        return (content)=>createBlocks(content, contentOrParsers);
    }
}
function italic(block) {
    const matches = block.match(/_.*?_/g);
    if (matches) {
        for (const match of matches){
            const value = match.substring(1, match.length - 1);
            const replacement = `<em>${value}</em>`;
            block = block.replace(match, replacement);
        }
    }
    return block;
}
function inlineCode(block) {
    const matches = block.match(/\`.*?\`/g);
    if (matches) {
        for (const match of matches){
            let value = match.substring(1, match.length - 1);
            value = value.replace(/&/g, "&amp;");
            value = value.replace(/</g, "&lt;");
            value = value.replace(/>/g, "&gt;");
            const replacement = `<code>${value}</code>`;
            block = block.replace(match, replacement);
        }
    }
    return block;
}
function strikethrough(block) {
    const matches = block.match(/~~.*?~~/g);
    if (matches) {
        for (const match of matches){
            const value = match.substring(2, match.length - 2);
            const replacement = `<del>${value}</del>`;
            block = block.replace(match, replacement);
        }
    }
    return block;
}
function linkAndImage(block) {
    const matches = block.match(/\[(.*?)\]\((.*?)\)/g);
    if (matches) {
        for (const match of matches){
            const isImage = block[block.indexOf(match) - 1] === "!";
            const label = match.substring(match.indexOf("[") + 1, match.indexOf("]"));
            const href = match.substring(match.indexOf("(") + 1, match.indexOf(")"));
            if (isImage) {
                block = block.replace("!" + match, `<img src="${href}" alt="${label}">`);
            } else {
                block = block.replace(match, `<a href="${href}">${label}</a>`);
            }
        }
    }
    return block;
}
function isEmptyBlock(block) {
    return block.trim() === "";
}
function emptyBlock(_block) {
    return "";
}
function isHeadingBlock(block) {
    return block.replaceAll("\n", "").trim().startsWith("#");
}
function headingBlock(block) {
    const singleLineBlock = block.replaceAll("\n", "").trim();
    const sizeIndicators = singleLineBlock.split(" ")[0].trim();
    const size = sizeIndicators.length;
    const value = singleLineBlock.split(" ").slice(1).join(" ").trim();
    return `<h${size}>${value}</h${size}>`;
}
function isCodeBlock(block) {
    const singleLineBlock = block.replaceAll("\n", "").trim();
    return singleLineBlock.startsWith("```") && singleLineBlock.endsWith("```");
}
function codeBlock(block) {
    const languageMatch = block.match(/\`\`\`\w+/);
    const language = languageMatch ? languageMatch[0].replace("```", "").trim() : false;
    let value = "";
    if (language) {
        value = block.replace(/\`\`\`\w+/, "").replace(/\n\`\`\`/, "");
        if (value.split("\n")[0].trim() === "") {
            value = value.replace("\n", "");
        }
        value = value.replace(/&/g, "&amp;");
        value = value.replace(/</g, "&lt;");
        value = value.replace(/>/g, "&gt;");
        value = value.replaceAll("\n", "<br>");
        return `<pre class="language-${language}"><code>${value}</code></pre>`;
    }
    return `<pre><code>${block.substring(3, block.length - 3)}</code></pre>`;
}
function isHorizontalLineBlock(block) {
    return block.replaceAll("\n", "").trim() === "***";
}
function horizontalLineBlock() {
    return `<hr>`;
}
function isQuoteBlock(block) {
    return block.replaceAll("\n", "").trim().startsWith(">");
}
function quoteBlock(block) {
    const matches = block.match(/>.*/g);
    if (matches) {
        return `<blockquote>${marky(matches.map((match)=>{
            return match.substring(1);
        }).join("\n"))}</blockquote>`;
    }
    return block;
}
const LIST_REGEX = /^(\s*[\*-123456789]\.?\s.*)[^\*]/gm;
function isListBlock(block) {
    return !!block.match(LIST_REGEX);
}
function listBlock(block) {
    let matches = block.match(LIST_REGEX);
    if (matches) {
        matches = matches.map((match)=>{
            match.replace(/\n|\/r|\/t/g, '');
            return match;
        });
        const isOrderedList = matches && matches[0][0].match(/\d/);
        let result = "";
        result += isOrderedList ? `<ol>` : `<ul>`;
        let i = 0;
        let match = matches[i];
        while(match){
            if (match.startsWith("  ")) {
                const nestedMatches = [];
                while(match && match.startsWith("  ")){
                    nestedMatches.push(match.substring(2));
                    match = matches[++i];
                }
                result += marky(nestedMatches.join(''));
            } else {
                result += `<li>${match.substring(2).trim()}</li>`;
                match = matches[++i];
            }
        }
        result += isOrderedList ? `</ol>` : `</ul>`;
        return result;
    }
    return block;
}
function paragraphBlock(block) {
    return `<p>${block.trim()}</p>`;
}
const defaultParsers = [
    {
        matcher: isEmptyBlock,
        renderers: [
            emptyBlock
        ]
    },
    {
        matcher: isHeadingBlock,
        renderers: [
            bold,
            italic,
            inlineCode,
            strikethrough,
            linkAndImage,
            headingBlock
        ]
    },
    {
        matcher: isCodeBlock,
        renderers: [
            codeBlock
        ]
    },
    {
        matcher: isHorizontalLineBlock,
        renderers: [
            horizontalLineBlock
        ]
    },
    {
        matcher: isQuoteBlock,
        renderers: [
            quoteBlock
        ]
    },
    {
        matcher: isListBlock,
        renderers: [
            bold,
            italic,
            inlineCode,
            strikethrough,
            linkAndImage,
            listBlock
        ]
    },
    {
        renderers: [
            bold,
            italic,
            inlineCode,
            strikethrough,
            linkAndImage,
            paragraphBlock
        ]
    }
];
export { bold as bold };
export { italic as italic };
export { inlineCode as inlineCode };
export { strikethrough as strikethrough };
export { linkAndImage as linkAndImage };
export { isEmptyBlock as isEmptyBlock };
export { emptyBlock as emptyBlock };
export { isHeadingBlock as isHeadingBlock };
export { headingBlock as headingBlock };
export { isCodeBlock as isCodeBlock };
export { codeBlock as codeBlock };
export { isHorizontalLineBlock as isHorizontalLineBlock };
export { horizontalLineBlock as horizontalLineBlock };
export { isQuoteBlock as isQuoteBlock };
export { quoteBlock as quoteBlock };
export { isListBlock as isListBlock };
export { listBlock as listBlock };
export { paragraphBlock as paragraphBlock };
export { marky as marky };
export { defaultParsers as defaultParsers };

