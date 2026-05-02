"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import { useCallback, useRef } from "react";

interface RichEditorProps {
  content: string;
  onChange: (html: string) => void;
}

// Toolbar button
function TB({
  onClick, active = false, title, children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={`p-1.5 rounded-md transition-all duration-150 cursor-pointer ${
        active
          ? "bg-primary/20 text-primary"
          : "text-text-main/50 hover:text-text-main hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}

// SVG icon helper
const I = ({ d, ...rest }: { d: string; [k: string]: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4" {...rest}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

export default function RichEditor({ content, onChange }: RichEditorProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextStyle,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: false }),
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder: "Start writing your post…" }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-[400px] prose-editor",
      },
    },
  });

  const uploadImage = useCallback(async (file: File) => {
    if (!editor) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) {
        editor.chain().focus().setImage({ src: data.url, alt: file.name }).run();
      } else {
        // Fallback: use base64 inline
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            editor.chain().focus().setImage({ src: e.target.result as string, alt: file.name }).run();
          }
        };
        reader.readAsDataURL(file);
      }
    } catch {
      // Fallback to base64
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          editor.chain().focus().setImage({ src: e.target.result as string }).run();
        }
      };
      reader.readAsDataURL(file);
    }
  }, [editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href ?? "";
    const url = window.prompt("URL:", prev);
    if (url === null) return;
    if (url === "") { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  const sep = <div className="w-px h-5 mx-1" style={{ background: "rgba(255,255,255,0.08)" }} />;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(9,19,40,0.6)",
      }}
    >
      {/* Toolbar */}
      <div
        className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b"
        style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(6,14,32,0.7)" }}
      >
        {/* Headings */}
        <TB title="Heading 1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })}>
          <span className="font-headline font-bold text-xs">H1</span>
        </TB>
        <TB title="Heading 2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })}>
          <span className="font-headline font-bold text-xs">H2</span>
        </TB>
        <TB title="Heading 3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })}>
          <span className="font-headline font-bold text-xs">H3</span>
        </TB>

        {sep}

        {/* Inline formatting */}
        <TB title="Bold" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M6 4h8a4 4 0 010 8H6zm0 8h9a4 4 0 010 8H6z"/></svg>
        </TB>
        <TB title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M11 4h6v2h-2.27l-3.46 12H14v2H8v-2h2.27l3.46-12H11z"/></svg>
        </TB>
        <TB title="Underline" onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 17a6 6 0 006-6V3h-2.5v8a3.5 3.5 0 01-7 0V3H6v8a6 6 0 006 6zm-7 2h14v2H5z"/></svg>
        </TB>
        <TB title="Strikethrough" onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M17.154 14c.23.516.346 1.09.346 1.72 0 1.342-.524 2.392-1.571 3.147C14.88 19.622 13.433 20 11.586 20c-1.64 0-3.263-.381-4.87-1.144V16.6c1.52.877 3.075 1.316 4.666 1.316 2.551 0 3.83-.732 3.839-2.197a2.21 2.21 0 00-.648-1.603l-.12-.116H3v-2h18v2zM7.457 8.7c-.448-.525-.672-1.19-.672-1.995C6.785 5.457 7.28 4.44 8.27 3.757 9.253 3.085 10.5 2.75 12 2.75c1.51 0 2.924.28 4.24.84V5.7C15.024 5.1 13.73 4.8 12.273 4.8c-1.255 0-2.2.262-2.835.787-.63.52-.947 1.16-.947 1.92 0 .306.065.59.196.846H7.457z"/></svg>
        </TB>
        <TB title="Highlight" onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive("highlight")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
        </TB>
        <TB title="Inline code" onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        </TB>

        {sep}

        {/* Lists */}
        <TB title="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")}>
          <I d="M9 6h11M9 12h11M9 18h11M5 6v.01M5 12v.01M5 18v.01" />
        </TB>
        <TB title="Ordered list" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6h11M10 12h11M10 18h11M4 6h.01M4 12h.01M4 18h.01" />
          </svg>
        </TB>
        <TB title="Blockquote" onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/></svg>
        </TB>
        <TB title="Code block" onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")}>
          <I d="M10 20l4-16M18 8l4 4-4 4M6 8L2 12l4 4" />
        </TB>

        {sep}

        {/* Alignment */}
        <TB title="Align left" onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })}>
          <I d="M4 6h16M4 10h10M4 14h16M4 18h10" />
        </TB>
        <TB title="Align center" onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })}>
          <I d="M4 6h16M7 10h10M4 14h16M7 18h10" />
        </TB>
        <TB title="Align right" onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })}>
          <I d="M4 6h16M10 10h10M4 14h16M10 18h10" />
        </TB>

        {sep}

        {/* Link / Image */}
        <TB title="Insert link" onClick={setLink} active={editor.isActive("link")}>
          <I d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </TB>
        <TB title="Insert image" onClick={() => fileRef.current?.click()}>
          <I d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </TB>

        {sep}

        {/* History */}
        <TB title="Undo" onClick={() => editor.chain().focus().undo().run()}>
          <I d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </TB>
        <TB title="Redo" onClick={() => editor.chain().focus().redo().run()}>
          <I d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
        </TB>
      </div>



      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadImage(file);
          e.target.value = "";
        }}
      />

      {/* Editor area */}
      <div className="px-6 py-5 editor-content-wrapper">
        <EditorContent editor={editor} />
      </div>

      {/* Editor styles */}
      <style>{`
        .editor-content-wrapper .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: rgba(222,229,255,0.2);
          pointer-events: none;
          height: 0;
          font-family: var(--font-inter);
        }
        .prose-editor { color: rgba(222,229,255,0.9); font-family: var(--font-inter); font-size: 0.9375rem; line-height: 1.75; }
        .prose-editor h1 { font-family: var(--font-epilogue); font-size: 2rem; font-weight: 700; color: #dee5ff; margin: 1.5rem 0 0.75rem; }
        .prose-editor h2 { font-family: var(--font-epilogue); font-size: 1.5rem; font-weight: 700; color: #dee5ff; margin: 1.25rem 0 0.5rem; }
        .prose-editor h3 { font-family: var(--font-epilogue); font-size: 1.25rem; font-weight: 600; color: #dee5ff; margin: 1rem 0 0.5rem; }
        .prose-editor p { margin: 0.75rem 0; }
        .prose-editor strong { color: #dee5ff; font-weight: 700; }
        .prose-editor em { color: rgba(222,229,255,0.8); }
        .prose-editor u { text-decoration-color: rgba(186,158,255,0.5); }
        .prose-editor s { text-decoration-color: rgba(222,229,255,0.4); }
        .prose-editor a { color: #ba9eff; text-decoration: underline; text-underline-offset: 3px; }
        .prose-editor a:hover { color: #61c2ff; }
        .prose-editor code { background: rgba(186,158,255,0.1); color: #ba9eff; padding: 0.15em 0.4em; border-radius: 4px; font-size: 0.875em; }
        .prose-editor pre { background: rgba(6,14,32,0.9); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 1rem; overflow-x: auto; margin: 1rem 0; }
        .prose-editor pre code { background: none; color: #61c2ff; padding: 0; font-size: 0.875rem; }
        .prose-editor blockquote { border-left: 3px solid rgba(186,158,255,0.4); padding-left: 1rem; margin: 1rem 0; color: rgba(222,229,255,0.6); }
        .prose-editor ul { list-style: disc; padding-left: 1.5rem; margin: 0.75rem 0; }
        .prose-editor ol { list-style: decimal; padding-left: 1.5rem; margin: 0.75rem 0; }
        .prose-editor li { margin: 0.25rem 0; }
        .prose-editor img { max-width: 100%; border-radius: 8px; margin: 1rem auto; display: block; border: 1px solid rgba(255,255,255,0.08); }
        .prose-editor img.ProseMirror-selectednode { outline: 2px solid rgba(186,158,255,0.6); }
        .prose-editor mark { background: rgba(186,158,255,0.25); color: #dee5ff; border-radius: 2px; padding: 0 2px; }
        .prose-editor hr { border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 1.5rem 0; }
        .prose-editor .ProseMirror-gapcursor:after { border-top-color: rgba(186,158,255,0.5); }
      `}</style>
    </div>
  );
}
