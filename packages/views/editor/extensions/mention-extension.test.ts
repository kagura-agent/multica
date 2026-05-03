import { describe, it, expect } from "vitest";
import { BaseMentionExtension } from "./mention-extension";

const tokenizer = BaseMentionExtension.config.markdownTokenizer!;
const renderMarkdown = BaseMentionExtension.config.renderMarkdown!;

function tokenize(src: string) {
  const start = tokenizer.start(src);
  if (start === -1) return undefined;
  return tokenizer.tokenize(src.slice(start));
}

describe("mention tokenizer", () => {
  it("parses a plain mention", () => {
    const token = tokenize("[@Alice](mention://member/aaa-bbb)");
    expect(token).toBeDefined();
    expect(token!.attributes.label).toBe("Alice");
    expect(token!.attributes.type).toBe("member");
    expect(token!.attributes.id).toBe("aaa-bbb");
  });

  it("parses a mention with escaped brackets (round-trip from renderMarkdown)", () => {
    // renderMarkdown escapes brackets: David[TF] → David\[TF\]
    const md = renderMarkdown({
      attrs: { id: "aaa-bbb", label: "David[TF]", type: "agent" },
    });
    expect(md).toBe("[@David\\[TF\\]](mention://agent/aaa-bbb)");

    const token = tokenize(md);
    expect(token).toBeDefined();
    expect(token!.attributes.label).toBe("David[TF]");
    expect(token!.attributes.type).toBe("agent");
  });

  it("does not match an ordinary Markdown link before a mention", () => {
    const src =
      "Check [docs](https://example.com) - [@User](mention://agent/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa)";

    // start() must NOT land on the [docs] link at index 6
    const start = tokenizer.start(src);
    expect(start).toBeGreaterThan(6);

    // tokenize from the correct start position
    const token = tokenizer.tokenize(src.slice(start));
    expect(token).toBeDefined();
    expect(token!.attributes.label).toBe("User");
    expect(token!.attributes.id).toBe("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
  });

  it("handles multiple ordinary links before a mention", () => {
    const src =
      "See [a](https://a.com) and [b](https://b.com) - [@Bot](mention://agent/abc-123)";
    const start = tokenizer.start(src);
    const token = tokenizer.tokenize(src.slice(start));
    expect(token).toBeDefined();
    expect(token!.attributes.label).toBe("Bot");
  });

  it("round-trips an agent label with nested brackets", () => {
    const md = renderMarkdown({
      attrs: { id: "x-y-z", label: "Bot[v2][beta]", type: "agent" },
    });
    const token = tokenize(md);
    expect(token).toBeDefined();
    expect(token!.attributes.label).toBe("Bot[v2][beta]");
  });

  it("parses issue mentions without @ prefix", () => {
    const token = tokenize("[MUL-123](mention://issue/aaa-bbb)");
    expect(token).toBeDefined();
    expect(token!.attributes.label).toBe("MUL-123");
    expect(token!.attributes.type).toBe("issue");
  });
});
