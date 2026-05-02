import Mention from "@tiptap/extension-mention";
import { mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { MentionView } from "./mention-view";

export const BaseMentionExtension = Mention.extend({
  addNodeView() {
    return ReactNodeViewRenderer(MentionView);
  },
  renderHTML({ node, HTMLAttributes }) {
    const type = node.attrs.type ?? "member";
    const prefix = type === "issue" ? "" : "@";
    return [
      "span",
      mergeAttributes(
        { "data-type": "mention" },
        this.options.HTMLAttributes,
        HTMLAttributes,
        {
          "data-mention-type": node.attrs.type ?? "member",
          "data-mention-id": node.attrs.id,
        },
      ),
      `${prefix}${node.attrs.label ?? node.attrs.id}`,
    ];
  },
  addAttributes() {
    return {
      ...this.parent?.(),
      type: {
        default: "member",
        parseHTML: (el: HTMLElement) =>
          el.getAttribute("data-mention-type") ?? "member",
        renderHTML: () => ({}),
      },
    };
  },
  markdownTokenizer: {
    name: "mention",
    level: "inline" as const,
    start(src: string) {
      return src.search(/\[@?.+?\]\(mention:\/\//);
    },
    tokenize(src: string) {
      // Use .+? (non-greedy) instead of [^\]]+ so labels containing
      // square brackets (e.g. "David[TF]") are matched correctly.
      const match = src.match(
        /^\[@?(.+?)\]\(mention:\/\/(\w+)\/([^)]+)\)/,
      );
      if (!match) return undefined;
      // Unescape backslash-escaped brackets that renderMarkdown may produce.
      const rawLabel = match[1].replace(/\\\[/g, "[").replace(/\\\]/g, "]");
      return {
        type: "mention",
        raw: match[0],
        attributes: { label: rawLabel, type: match[2] ?? "member", id: match[3] },
      };
    },
  },
  parseMarkdown: (token: any, helpers: any) => {
    return helpers.createNode("mention", token.attributes);
  },
  renderMarkdown: (node: any) => {
    const { id, label, type = "member" } = node.attrs || {};
    const prefix = type === "issue" ? "" : "@";
    // Escape square brackets in the label so the markdown link syntax
    // is not broken when the name contains [ or ] (e.g. "David[TF]").
    const safeLabel = (label ?? id).replace(/\[/g, "\\[").replace(/\]/g, "\\]");
    return `[${prefix}${safeLabel}](mention://${type}/${id})`;
  },
});
