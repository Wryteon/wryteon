import EditorJS, {
  type EditorConfig,
  type OutputData,
} from "@editorjs/editorjs";
import Header from "@editorjs/header";
import Paragraph from "@editorjs/paragraph";
import Image from "@editorjs/image";
import Code from "@editorjs/code";
import Quote from "@editorjs/quote";
import List from "@editorjs/list";
import Delimiter from "@editorjs/delimiter";

type SaveHandler = (data: OutputData) => void;

class EditorComponent extends HTMLElement {
  private editor: EditorJS | null = null;
  private saveCallback: SaveHandler | null = null;

  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
    this.initializeEditor();
  }

  disconnectedCallback() {
    if (this.editor) {
      this.editor.destroy();
    }
  }

  private render() {
    this.innerHTML = `
      <style>
        :host {
          --color-primary: #007acc;
          --color-primary-hover: #005aa3;
          --color-border: #e1e5e9;
          --color-text-primary: #333;
          --color-text-secondary: #666;
        }

        .editor-wrapper {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .editor-toolbar {
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 2px solid var(--color-border);
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }

        .toolbar-info {
          flex: 1;
          color: var(--color-text-secondary);
          font-size: 13px;
          margin-right: 10px;
        }

        .toolbar-buttons {
          display: flex;
          gap: 8px;
        }

        .save-button,
        .preview-button {
          background: var(--color-primary);
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .save-button:hover,
        .preview-button:hover {
          background: var(--color-primary-hover);
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .preview-button {
          background: #6c757d;
        }

        .preview-button:hover {
          background: #5a6268;
        }

        .editor-container {
          border: 1px solid var(--color-border);
          border-radius: 8px;
          padding: 20px;
          min-height: 500px;
          background: white;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        /* Editor.js styles */
        .ce-editor__redactor {
          padding: 0;
          min-height: 500px;
        }

        .ce-paragraph {
          line-height: 1.6;
          margin-bottom: 12px;
        }

        .ce-header {
          margin: 20px 0 12px 0;
          line-height: 1.2;
          font-weight: 700;
        }

        .ce-header--h1 {
          font-size: 32px;
        }

        .ce-header--h2 {
          font-size: 24px;
        }

        .ce-header--h3 {
          font-size: 20px;
        }

        .ce-header--h4 {
          font-size: 18px;
        }

        .ce-header--h5 {
          font-size: 16px;
        }

        .ce-header--h6 {
          font-size: 14px;
        }

        .ce-quote {
          border-left: 4px solid var(--color-primary);
          padding: 16px 16px 16px 20px;
          margin: 16px 0;
          background: #f5f5f5;
          border-radius: 4px;
          font-style: italic;
          color: var(--color-text-secondary);
        }

        .ce-code {
          background: #282c34;
          color: #abb2bf;
          padding: 16px;
          border-radius: 4px;
          margin: 12px 0;
          font-family: 'Courier New', Courier, monospace;
          font-size: 14px;
          overflow-x: auto;
        }

        .ce-list {
          margin: 12px 0;
          padding-left: 24px;
        }

        .ce-list--ordered {
          list-style-type: decimal;
        }

        .ce-list--unordered {
          list-style-type: disc;
        }

        .ce-delimiter {
          text-align: center;
          margin: 20px 0;
          color: var(--color-border);
          font-size: 20px;
        }

        /* Toolbar styling */
        .ce-toolbar {
          margin-bottom: 20px;
        }

        .ce-toolbar__content {
          max-width: 100%;
        }

        .ce-toolbar__plus {
          color: var(--color-primary);
        }

        .ce-toolbar__settings-btn {
          color: var(--color-primary);
        }

        /* Block styling */
        .ce-block {
          margin-bottom: 12px;
        }

        .ce-block--selected {
          background: rgba(0, 122, 204, 0.05);
          border-radius: 4px;
        }

        /* Image styling */
        .ce-image {
          margin: 20px 0;
        }

        .ce-image img {
          max-width: 100%;
          height: auto;
          border-radius: 4px;
        }

        .image-tool__image-picture {
          margin: 12px 0;
        }

        .image-tool__caption {
          margin-top: 8px;
          font-size: 13px;
          color: var(--color-text-secondary);
        }

        .image-tool--filled {
          background: #f5f5f5;
          padding: 8px;
          border-radius: 4px;
        }
      </style>
      <div class="editor-wrapper">
        <div class="editor-toolbar">
          <div class="toolbar-info">
            ✏️ Create your post below. Use <strong>+</strong> button to add new blocks.
          </div>
          <div class="toolbar-buttons">
            <button class="preview-button" id="preview-btn">Preview</button>
            <button class="save-button" id="save-btn">💾 Save Post</button>
          </div>
        </div>
        <div class="editor-container" id="editor"></div>
      </div>
    `;

    const root = this as HTMLElement;
    const saveButton = root.querySelector<HTMLButtonElement>("#save-btn");
    const previewButton = root.querySelector<HTMLButtonElement>("#preview-btn");

    if (saveButton) {
      saveButton.addEventListener("click", () => this.saveData());
    }

    if (previewButton) {
      previewButton.addEventListener("click", () => this.previewData());
    }
  }

  private async initializeEditor() {
    const editorElement = this.querySelector<HTMLDivElement>("#editor");
    if (!editorElement) return;

    const parseInitialData = (raw: string | null): OutputData => {
      if (!raw) {
        return { blocks: [] };
      }

      try {
        const parsed = JSON.parse(raw) as OutputData;
        if (parsed && Array.isArray(parsed.blocks)) {
          return parsed;
        }
      } catch (error) {
        console.warn("Failed to parse editor data attribute", error);
      }

      return { blocks: [] };
    };

    const initialData = parseInitialData(this.getAttribute("data"));

    const tools: Record<string, unknown> = {
      header: {
        class: Header,
        config: {
          placeholder: "Enter a heading",
          levels: [1, 2, 3, 4, 5, 6],
          defaultLevel: 2,
        },
        shortcut: "CMD+SHIFT+H",
      },
      paragraph: {
        class: Paragraph,
        inlineToolbar: true,
        config: {
          placeholder: 'Start typing or press "/" for commands...',
        },
      },
      list: {
        class: List,
        inlineToolbar: true,
        config: {
          defaultStyle: "unordered",
        },
        shortcut: "CMD+SHIFT+L",
      },
      code: {
        class: Code,
        config: {
          placeholder: "Enter code snippet...",
        },
        shortcut: "CMD+SHIFT+C",
      },
      quote: {
        class: Quote,
        inlineToolbar: true,
        config: {
          quotePlaceholder: "Enter a quote",
          captionPlaceholder: "Quote author",
        },
        shortcut: "CMD+SHIFT+Q",
      },
      image: {
        class: Image,
        config: {
          endpoints: {
            byFile: "/api/upload",
            byUrl: "/api/fetchUrl",
          },
          field: "image",
          types: ["image/jpeg", "image/png", "image/gif", "image/webp"],
          captionPlaceholder: "Add image caption...",
          buttonText: "Choose an Image",
        },
      },
      delimiter: {
        class: Delimiter,
        shortcut: "CMD+SHIFT+D",
      },
    };

    const config: EditorConfig = {
      holder: editorElement,
      tools: tools as unknown as NonNullable<EditorConfig["tools"]>,
      data: initialData,
      autofocus: true,
      placeholder: "Let's create an amazing post! 🚀",
      onReady: () => {
        console.log("Editor.js is ready to work!");
      },
    };

    this.editor = new EditorJS(config);

    // Add keyboard shortcuts info
    this.dispatchEvent(
      new CustomEvent("editor-ready", {
        detail: {
          shortcuts: {
            "CMD+SHIFT+H": "Heading",
            "CMD+SHIFT+L": "List",
            "CMD+SHIFT+C": "Code",
            "CMD+SHIFT+Q": "Quote",
            "CMD+SHIFT+D": "Delimiter",
          },
        },
        bubbles: true,
      })
    );
  }

  private async saveData() {
    if (!this.editor) return;

    try {
      const outputData = await this.editor.save();
      if (this.saveCallback) {
        this.saveCallback(outputData);
      } else {
        // Dispatch custom event for parent components to listen to
        this.dispatchEvent(
          new CustomEvent<OutputData>("editor-save", {
            detail: outputData,
            bubbles: true,
          })
        );
      }
    } catch (error) {
      console.error("Saving failed:", error);
      this.dispatchEvent(
        new CustomEvent("editor-error", {
          detail: error,
          bubbles: true,
        })
      );
    }
  }

  private async previewData() {
    if (!this.editor) return;

    try {
      const outputData = await this.editor.save();

      const title =
        document.querySelector<HTMLInputElement>("#title-input")?.value ?? "";
      const slug =
        document.querySelector<HTMLInputElement>("#slug-input")?.value ?? "";
      const statusRaw =
        document.querySelector<HTMLSelectElement>("#status-select")?.value ??
        "draft";

      const status = statusRaw === "published" ? "published" : "draft";
      const safeSlug = slug.length > 0 ? slug : "new-post";

      const payload = {
        title: title.length > 0 ? title : "Preview",
        slug: safeSlug,
        blocks: { blocks: outputData.blocks },
        status,
      };

      const form = document.createElement("form");
      form.method = "POST";
      form.action = "/admin/preview";
      form.target = "_blank";

      const input = document.createElement("input");
      input.type = "hidden";
      input.name = "payload";
      input.value = JSON.stringify(payload);
      form.appendChild(input);

      document.body.appendChild(form);
      form.submit();
      form.remove();

      // Dispatch preview event
      this.dispatchEvent(
        new CustomEvent<OutputData>("editor-preview", {
          detail: outputData,
          bubbles: true,
        })
      );
    } catch (error) {
      console.error("Preview failed:", error);
    }
  }

  // Method to set save callback
  setSaveCallback(callback: SaveHandler) {
    this.saveCallback = callback;
  }

  // Method to get current data
  async getData() {
    if (!this.editor) return null;
    return await this.editor.save();
  }
}

// Register the custom element
customElements.define("editor-component", EditorComponent);

export default EditorComponent;
